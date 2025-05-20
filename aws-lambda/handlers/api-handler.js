// API Handler for AWS Lambda
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

/**
 * Main handler for API Gateway requests
 */
export const handler = async (event, context) => {
  try {
    console.log('Received request:', JSON.stringify(event));
    
    const { routeKey, path, body } = event;
    const method = event.requestContext?.http?.method || 'GET';
    const taskId = event.pathParameters?.taskId;
    
    // Parse request body if it exists
    let requestBody;
    try {
      requestBody = body ? JSON.parse(body) : {};
    } catch (e) {
      console.error('Error parsing request body', e);
      requestBody = {};
    }
    
    // Handle different routes
    switch (true) {
      // Task submission route
      case path?.includes('/task/launch') && method === 'POST':
        return await handleTaskSubmission(requestBody);
      
      // Task status route
      case path?.includes('/task/status/') && method === 'GET':
        return await handleTaskStatus(taskId);
      
      // Task list route
      case path?.includes('/task/list') && method === 'GET':
        return await handleTaskList(event.queryStringParameters || {});
      
      // Task progress update route
      case path?.includes('/task/progress') && method === 'POST':
        return await handleTaskProgress(requestBody);
      
      // Heartbeat route
      case path?.includes('/heartbeat') && method === 'GET':
        return await handleHeartbeat(event.queryStringParameters?.id);
      
      // Default route - Not found
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ 
            status: 'error',
            message: `Route ${path} with method ${method} not found`
          }),
          headers: { 'Content-Type': 'application/json' }
        };
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        status: 'error',
        message: 'Internal server error',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

/**
 * Handle task submission
 */
async function handleTaskSubmission(requestBody) {
  try {
    // Generate a task ID if one isn't provided
    const taskId = requestBody.taskId || requestBody.taskConfig?.row?.系统SKU || uuidv4();
    
    // Save task metadata to DynamoDB
    await dynamoDB.send(new PutCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Item: {
        taskId: taskId,
        status: 'submitted',
        startTime: new Date().toISOString(),
        progress: 0,
        metadata: requestBody
      }
    }));
    
    // Send task to SQS queue for processing
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.TASK_QUEUE,
      MessageBody: JSON.stringify({
        taskId,
        taskData: requestBody
      })
    }));
    
    return {
      statusCode: 202,
      body: JSON.stringify({
        status: 'accepted',
        taskId: taskId,
        message: 'Task accepted for processing'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error submitting task:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error submitting task',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Handle task status retrieval
 */
async function handleTaskStatus(taskId) {
  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Task ID is required'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
  
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Key: { taskId }
    }));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: 'not_found',
          taskId: taskId,
          timestamp: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    const taskInfo = result.Item;
    
    // Format response based on task status
    let response;
    if (taskInfo.status === 'completed' || taskInfo.status === 'error') {
      response = {
        status: taskInfo.status,
        taskId: taskId,
        completedAt: taskInfo.completedAt,
        error: taskInfo.error,
        result: taskInfo.result,
        timestamp: new Date().toISOString()
      };
    } else {
      response = {
        status: taskInfo.status,
        taskId: taskId,
        progress: taskInfo.progress,
        startedAt: taskInfo.startTime,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error getting task status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error retrieving task status',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Handle task list retrieval
 */
async function handleTaskList(queryParams) {
  try {
    const limit = parseInt(queryParams.limit || process.env.LIST_LIMIT || '100', 10);
    const status = queryParams.status || null;
    
    let params = {
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Limit: limit
    };
    
    // If status is provided, query by status
    if (status) {
      params = {
        ...params,
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'status = :status',
        ExpressionAttributeValues: {
          ':status': status
        }
      };
      
      const result = await dynamoDB.send(new QueryCommand(params));
      
      // Transform results
      const tasks = result.Items.map(item => ({
        taskId: item.taskId,
        status: item.status,
        progress: item.progress,
        startTime: item.startTime,
        completedAt: item.completedAt
      }));
      
      return {
        statusCode: 200,
        body: JSON.stringify({ tasks }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      // No status provided, scan the table
      const result = await dynamoDB.send(new QueryCommand({
        TableName: process.env.DYNAMODB_TASK_TABLE,
        Limit: limit
      }));
      
      // Group by status
      const running = [];
      const completed = [];
      
      result.Items.forEach(item => {
        if (item.status === 'running' || item.status === 'processing' || item.status === 'submitted') {
          running.push({
            taskId: item.taskId,
            status: item.status,
            startTime: item.startTime,
            progress: item.progress
          });
        } else {
          completed.push({
            taskId: item.taskId,
            status: item.status,
            completedAt: item.completedAt
          });
        }
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          running,
          completed
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (error) {
    console.error('Error listing tasks:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error listing tasks',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Handle task progress updates
 */
async function handleTaskProgress(requestBody) {
  const { taskId, progress, status } = requestBody;
  
  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Task ID is required'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
  
  try {
    await dynamoDB.send(new PutCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Item: {
        taskId,
        progress: progress || 0,
        status: status || 'running',
        lastUpdated: new Date().toISOString()
      }
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Task progress updated'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error updating task progress:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error updating task progress',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

/**
 * Handle heartbeat request
 */
async function handleHeartbeat(id) {
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Task ID is required'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
  
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Key: { taskId: id }
    }));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: 'not_found',
          taskId: id,
          timestamp: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    const taskInfo = result.Item;
    
    // Update last heartbeat time
    await dynamoDB.send(new PutCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Item: {
        ...taskInfo,
        lastHeartbeat: new Date().toISOString()
      }
    }));
    
    // Format response based on task status
    if (taskInfo.status === 'completed' || taskInfo.status === 'error') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: taskInfo.status,
          taskId: id,
          completedAt: taskInfo.completedAt,
          error: taskInfo.error,
          timestamp: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: taskInfo.status,
          taskId: id,
          progress: taskInfo.progress,
          startedAt: taskInfo.startTime,
          timestamp: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error processing heartbeat',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}