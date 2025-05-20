// Task Launcher for AWS Lambda
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

/**
 * Launches a task by enqueueing it for background processing
 * This handler focuses solely on task submission logic
 */
export const handler = async (event, context) => {
  try {
    console.log('Received task submission event:', JSON.stringify(event));
    
    // Parse request body
    const requestBody = JSON.parse(event.body);
    
    // Generate a task ID if one isn't provided
    const taskId = requestBody.taskId || requestBody.taskConfig?.row?.系统SKU || uuidv4();
    console.log(`Processing task with ID: ${taskId}`);
    
    // Validate required fields
    if (!requestBody.task_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'Missing required field: task_name'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    // Initialize task metadata
    const timestamp = new Date().toISOString();
    
    // Save initial task metadata to DynamoDB
    const taskMetadata = {
      taskId,
      status: 'submitted',
      startTime: timestamp,
      progress: 0,
      task_name: requestBody.task_name,
      adsPowerUserId: requestBody.adsPowerUserId || requestBody.row?.浏览器id || process.env.ADSPOWER_DEFAULT_USER_ID,
      runningData: requestBody,
      lastUpdated: timestamp
    };
    
    await dynamoDB.send(new PutCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Item: taskMetadata
    }));
    
    // Add to processing queue
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.TASK_QUEUE,
      MessageBody: JSON.stringify({
        taskId,
        taskData: requestBody
      }),
      MessageAttributes: {
        TaskType: {
          DataType: 'String',
          StringValue: requestBody.task_name
        }
      }
    }));
    
    console.log(`Task ${taskId} enqueued for processing`);
    
    // Return accepted response
    return {
      statusCode: 202,
      body: JSON.stringify({
        status: 'accepted',
        taskId,
        message: 'Task accepted and queued for processing',
        timestamp
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error launching task:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error launching task',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}