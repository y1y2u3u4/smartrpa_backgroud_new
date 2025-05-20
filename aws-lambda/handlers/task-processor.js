// Task Processor for AWS Lambda
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { launchAdsPowerBrowser, createAdsPowerPage, closeAdsPowerBrowser } from '../../serverless-adsPower.js';
import { taskExecutor } from '../../modules/taskExecutor.js';
import { eventHandler } from '../../modules/eventHandler.js';
import { matchAndReplace } from '../../modules/dataProcessor.js';

// Initialize AWS clients
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

/**
 * Process tasks from the SQS queue
 */
export const handler = async (event, context) => {
  console.log('Received task processing event:', JSON.stringify(event));
  
  // Get the message from the SQS event
  const message = event.Records[0];
  if (!message) {
    console.error('No message found in SQS event');
    return;
  }
  
  let browser = null;
  let page = null;
  const startTime = new Date();
  
  try {
    // Parse message body
    const messageBody = JSON.parse(message.body);
    const { taskId, taskData } = messageBody;
    
    console.log(`Processing task ${taskId}`);
    
    // Update task status to 'processing'
    await updateTaskStatus(taskId, 'processing');
    
    // Setup timeout checking
    const timeout = setTimeout(() => {
      throw new Error('Task processing timed out');
    }, 840000); // 14 minutes to allow for cleanup
    
    // Extract task parameters
    const task_name = taskData.task_name;
    if (!task_name) {
      throw new Error('Missing required field: task_name');
    }
    
    const adsPowerUserId = taskData.adsPowerUserId || 
                          (taskData.row && taskData.row.浏览器id) || 
                          process.env.ADSPOWER_DEFAULT_USER_ID;
    
    const BASE_URL = taskData.BASE_URL || process.env.ADSPOWER_REMOTE_API_URL || null;
    
    // Setup progress reporting function
    const updateTaskProgress = (status, message, progress = null) => {
      const progressData = {
        taskId,
        status: status || 'processing',
        message,
        progress: progress !== null ? progress : undefined,
        timestamp: new Date().toISOString()
      };
      
      // Store progress update in S3
      try {
        const key = `tasks/${taskId}/progress/${Date.now()}.json`;
        s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: JSON.stringify(progressData),
          ContentType: 'application/json'
        }));
      } catch (err) {
        console.warn('Failed to store progress in S3:', err);
      }
      
      // Update DynamoDB
      updateTaskStatus(taskId, status, progress, message);
    };
    
    // Launch AdsPower browser
    console.log(`Launching AdsPower browser with user ID: ${adsPowerUserId}`);
    updateTaskProgress('initializing', 'Launching browser');
    browser = await launchAdsPowerBrowser(adsPowerUserId, BASE_URL);
    
    // Create page
    updateTaskProgress('initializing', 'Setting up browser page', 10);
    page = await createAdsPowerPage(browser);
    
    // Load task executor and event handler
    updateTaskProgress('loading', 'Loading task modules', 20);
    await taskExecutor(task_name);
    await eventHandler(task_name);
    
    // Import the handleEvent function
    const handleEvent = await importHandleEvent(task_name);
    
    // Process rows
    const rows = Array.isArray(taskData.row) ? taskData.row : [taskData.row];
    console.log('Processing rows:', rows);
    
    // Process each row
    updateTaskProgress('processing', 'Processing data rows', 30);
    for (const row of rows) {
      // Execute task logic similar to handler_run_internal
      const cityname = row.cityname;
      console.log('Processing city:', cityname);
      
      updateTaskProgress('processing', `Processing ${cityname}`, 40);
      
      // Process events
      const events = await fetchEventsForTask(task_name);
      console.log(`Processing ${events.length} events for task ${task_name}`);
      
      // Process each event
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        updateTaskProgress('processing', `Processing event ${index + 1}/${events.length}`, 50 + (index / events.length * 40));
        
        // Handle event
        await handleEvent(event, page, browser, index, [], task_name, cityname);
      }
    }
    
    // Cleanup
    clearTimeout(timeout);
    updateTaskProgress('finishing', 'Task completed successfully', 95);
    
    // Mark task as completed
    const result = {
      status: 'completed',
      taskId,
      executionTime: new Date() - startTime,
      timestamp: new Date().toISOString()
    };
    
    await updateTaskStatus(taskId, 'completed', 100, 'Task completed successfully', result);
    console.log(`Task ${taskId} completed successfully`);
    
  } catch (error) {
    console.error('Error processing task:', error);
    
    // Mark task as failed
    try {
      await updateTaskStatus(
        JSON.parse(event.Records[0].body).taskId,
        'error',
        0,
        'Task failed',
        { error: error.message }
      );
    } catch (err) {
      console.error('Error updating task status after failure:', err);
    }
  } finally {
    // Cleanup browser resources
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(e => console.warn('Error closing page:', e));
      }
      
      if (browser) {
        const userId = JSON.parse(event.Records[0].body).taskData.adsPowerUserId || 
                      (JSON.parse(event.Records[0].body).taskData.row && 
                       JSON.parse(event.Records[0].body).taskData.row.浏览器id) || 
                      process.env.ADSPOWER_DEFAULT_USER_ID;
                      
        await closeAdsPowerBrowser(userId).catch(e => console.warn('Error closing browser:', e));
      }
    } catch (err) {
      console.warn('Error during cleanup:', err);
    }
  }
};

/**
 * Update task status in DynamoDB
 */
async function updateTaskStatus(taskId, status, progress = null, message = null, result = null) {
  try {
    // Get current task data
    const currentTask = await dynamoDB.send(new GetCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Key: { taskId }
    }));
    
    // Prepare updated task data
    const now = new Date().toISOString();
    const taskData = {
      ...(currentTask.Item || {}),
      taskId,
      status,
      lastUpdated: now
    };
    
    // Update completion information if complete or error
    if (status === 'completed' || status === 'error') {
      taskData.completedAt = now;
    }
    
    // Add optional fields if provided
    if (progress !== null) {
      taskData.progress = progress;
    }
    
    if (message) {
      taskData.message = message;
    }
    
    if (result) {
      taskData.result = result;
    }
    
    // Store in DynamoDB
    await dynamoDB.send(new PutCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Item: taskData
    }));
    
    console.log(`Updated task ${taskId} status to ${status}`);
  } catch (error) {
    console.error(`Error updating task ${taskId} status:`, error);
  }
}

/**
 * Import the handleEvent function for the task
 */
async function importHandleEvent(task_name) {
  try {
    // Import the event handler module dynamically
    const modulePath = `../../modules/eventHandler_${task_name}.js`;
    const module = await import(modulePath);
    return module.handleEvent;
  } catch (error) {
    console.log(`Could not find specific event handler for ${task_name}, using default`);
    
    // Import default event handler
    const defaultModule = await import('../../modules/eventHandler.js');
    return defaultModule.handleEvent;
  }
}

/**
 * Fetch events for a task
 */
async function fetchEventsForTask(task_name) {
  // In a real implementation, this would load from S3 or another source
  // For this example, return a simple mock event
  return [{
    type: 'navigation',
    url: 'https://example.com'
  }];
}