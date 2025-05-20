// Cloud Run Server for SmartRPA
import express from 'express';
import cors from 'cors';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { launchAdsPowerBrowser, createAdsPowerPage, closeAdsPowerBrowser } from '../serverless-adsPower.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// Initialize Cloud Storage
const storage = new Storage();
const bucketName = process.env.CLOUD_STORAGE_BUCKET || 'smartrpa-data';

// Collection references
const tasksCollection = firestore.collection('tasks');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SmartRPA API server running'
  });
});

// Submit task endpoint
app.post('/task/launch', async (req, res) => {
  try {
    const taskId = req.body.taskId || req.body.taskConfig?.row?.系统SKU || uuidv4();
    const task_name = req.body.task_name;
    
    if (!task_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: task_name'
      });
    }
    
    const timestamp = new Date();
    
    // Save task to Firestore
    await tasksCollection.doc(taskId).set({
      taskId,
      status: 'submitted',
      startTime: timestamp,
      progress: 0,
      task_name,
      metadata: req.body,
      lastUpdated: timestamp
    });
    
    // Respond to client
    res.status(202).json({
      status: 'accepted',
      taskId,
      message: 'Task accepted and queued for processing'
    });
    
    // Process task in background
    processTask(taskId, req.body)
      .catch(error => {
        console.error(`Error processing task ${taskId}:`, error);
        updateTaskStatus(taskId, 'error', 0, error.message);
      });
      
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error submitting task',
      error: error.message
    });
  }
});

// Check task status endpoint
app.get('/task/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        status: 'error',
        message: 'Task ID is required'
      });
    }
    
    const taskDoc = await tasksCollection.doc(taskId).get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({
        status: 'not_found',
        taskId,
        timestamp: new Date()
      });
    }
    
    const taskData = taskDoc.data();
    
    // Format response
    let response;
    if (taskData.status === 'completed' || taskData.status === 'error') {
      response = {
        status: taskData.status,
        taskId,
        completedAt: taskData.completedAt?.toDate(),
        error: taskData.error,
        result: taskData.result,
        timestamp: new Date()
      };
    } else {
      response = {
        status: taskData.status,
        taskId,
        progress: taskData.progress,
        message: taskData.message,
        startedAt: taskData.startTime?.toDate(),
        timestamp: new Date()
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving task status',
      error: error.message
    });
  }
});

// List tasks endpoint
app.get('/task/list', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    
    let query = tasksCollection;
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.limit(parseInt(limit, 10)).get();
    
    const running = [];
    const completed = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const baseInfo = {
        taskId: data.taskId,
        task_name: data.task_name,
        lastUpdated: data.lastUpdated?.toDate()
      };
      
      if (['running', 'processing', 'submitted', 'initializing'].includes(data.status)) {
        running.push({
          ...baseInfo,
          status: data.status,
          startTime: data.startTime?.toDate(),
          progress: data.progress
        });
      } else {
        completed.push({
          ...baseInfo,
          status: data.status,
          completedAt: data.completedAt?.toDate()
        });
      }
    });
    
    res.json({
      running,
      completed,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error listing tasks',
      error: error.message
    });
  }
});

// Heartbeat endpoint
app.get('/heartbeat', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Task ID is required'
      });
    }
    
    const taskDoc = await tasksCollection.doc(id).get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({
        status: 'not_found',
        taskId: id,
        timestamp: new Date()
      });
    }
    
    const taskData = taskDoc.data();
    
    // Update last heartbeat time
    await tasksCollection.doc(id).update({
      lastHeartbeat: new Date()
    });
    
    // Format response
    if (taskData.status === 'completed' || taskData.status === 'error') {
      return res.json({
        status: taskData.status,
        taskId: id,
        completedAt: taskData.completedAt?.toDate(),
        error: taskData.error,
        timestamp: new Date()
      });
    } else {
      return res.json({
        status: taskData.status,
        taskId: id,
        progress: taskData.progress,
        startedAt: taskData.startTime?.toDate(),
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error processing heartbeat',
      error: error.message
    });
  }
});

// Progress update endpoint
app.post('/task-progress', async (req, res) => {
  try {
    const { taskId, progress, status, message } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        status: 'error',
        message: 'Task ID is required'
      });
    }
    
    // Update task in Firestore
    const taskRef = tasksCollection.doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }
    
    // Update fields
    const updateFields = {
      lastUpdated: new Date()
    };
    
    if (progress !== undefined) {
      updateFields.progress = progress;
    }
    
    if (status) {
      updateFields.status = status;
    }
    
    if (message) {
      updateFields.message = message;
    }
    
    await taskRef.update(updateFields);
    
    res.json({
      status: 'success',
      message: 'Task progress updated'
    });
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating task progress',
      error: error.message
    });
  }
});

/**
 * Process task in background
 */
async function processTask(taskId, taskData) {
  let browser = null;
  let page = null;
  const startTime = new Date();
  
  try {
    // Update task status
    await updateTaskStatus(taskId, 'processing', 10, 'Processing started');
    
    // Extract task parameters
    const task_name = taskData.task_name;
    if (!task_name) {
      throw new Error('Missing required field: task_name');
    }
    
    const adsPowerUserId = taskData.adsPowerUserId || 
                          (taskData.row && taskData.row.浏览器id) || 
                          process.env.ADSPOWER_DEFAULT_USER_ID || 'kn8o287';
    
    const BASE_URL = taskData.BASE_URL || process.env.ADSPOWER_REMOTE_API_URL || null;
    
    // Import required modules
    const { taskExecutor } = await import('../modules/taskExecutor.js');
    const { eventHandler } = await import('../modules/eventHandler.js');
    
    // Launch browser
    await updateTaskStatus(taskId, 'initializing', 20, 'Launching browser');
    browser = await launchAdsPowerBrowser(adsPowerUserId, BASE_URL);
    
    // Create page
    page = await createAdsPowerPage(browser);
    
    // Load task executor and event handler
    await updateTaskStatus(taskId, 'loading', 30, 'Loading task modules');
    await taskExecutor(task_name);
    await eventHandler(task_name);
    
    // Import handle event
    let handleEventFunc;
    try {
      const modulePath = `../modules/eventHandler_${task_name}.js`;
      const module = await import(modulePath);
      handleEventFunc = module.handleEvent;
    } catch (error) {
      console.log(`Could not find specific event handler for ${task_name}, using default`);
      const defaultModule = await import('../modules/eventHandler.js');
      handleEventFunc = defaultModule.handleEvent;
    }
    
    // Process rows
    const rows = Array.isArray(taskData.row) ? taskData.row : [taskData.row];
    
    // Process events
    // This is simplified - in a real implementation you'd probably load the events from Firestore or Cloud Storage
    const mockEvents = [
      { type: 'navigation', url: 'https://example.com' }
    ];
    
    await updateTaskStatus(taskId, 'processing', 50, 'Processing events');
    
    // Process events
    for (let i = 0; i < mockEvents.length; i++) {
      const event = mockEvents[i];
      const progress = 50 + (i / mockEvents.length * 40);
      
      await updateTaskStatus(taskId, 'processing', progress, `Processing event ${i + 1}/${mockEvents.length}`);
      
      // Process event
      for (const row of rows) {
        const cityname = row.cityname || 'unknown';
        await handleEventFunc(event, page, browser, i, [], task_name, cityname);
      }
    }
    
    // Task completed successfully
    const result = {
      status: 'completed',
      executionTime: new Date() - startTime
    };
    
    await updateTaskStatus(taskId, 'completed', 100, 'Task completed successfully', null, result);
  } catch (error) {
    console.error(`Error processing task ${taskId}:`, error);
    await updateTaskStatus(taskId, 'error', 0, error.message, error.message);
  } finally {
    // Cleanup
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(e => console.warn('Error closing page:', e));
      }
      
      if (browser) {
        const userId = taskData.adsPowerUserId || 
                     (taskData.row && taskData.row.浏览器id) || 
                     process.env.ADSPOWER_DEFAULT_USER_ID || 'kn8o287';
                     
        await closeAdsPowerBrowser(userId).catch(e => console.warn('Error closing browser:', e));
      }
    } catch (err) {
      console.warn('Error during cleanup:', err);
    }
  }
}

/**
 * Update task status in Firestore
 */
async function updateTaskStatus(taskId, status, progress = null, message = null, error = null, result = null) {
  try {
    const taskRef = tasksCollection.doc(taskId);
    const now = new Date();
    
    const updateData = {
      status,
      lastUpdated: now
    };
    
    // Add optional fields
    if (progress !== null) {
      updateData.progress = progress;
    }
    
    if (message) {
      updateData.message = message;
    }
    
    if (status === 'completed' || status === 'error') {
      updateData.completedAt = now;
      
      if (error) {
        updateData.error = error;
      }
      
      if (result) {
        updateData.result = result;
      }
    }
    
    await taskRef.update(updateData);
    console.log(`Updated task ${taskId} status to ${status}`);
  } catch (updateError) {
    console.error(`Error updating task ${taskId} status:`, updateError);
  }
}

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Cleanup handler for Cloud Run
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});