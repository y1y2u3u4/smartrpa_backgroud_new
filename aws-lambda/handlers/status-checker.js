// Status Checker for AWS Lambda
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Handler for task status checking functions
 */
export const handler = async (event, context) => {
  try {
    console.log('Received status check event:', JSON.stringify(event));
    
    // Determine request type from path
    const path = event.requestContext?.http?.path || '';
    const taskId = event.pathParameters?.taskId;
    
    if (path.includes('/task/status/') && taskId) {
      // Handle single task status check
      return await getTaskStatus(taskId);
    } else if (path.includes('/task/list')) {
      // Handle task list request
      return await listTasks(event.queryStringParameters || {});
    } else {
      // Invalid request
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'error',
          message: 'Invalid request path'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (error) {
    console.error('Error checking status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error checking task status',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

/**
 * Get status of a specific task
 */
async function getTaskStatus(taskId) {
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
    // Query DynamoDB for task status
    const result = await dynamoDB.send(new GetCommand({
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Key: { taskId }
    }));
    
    // Task not found
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: 'not_found',
          taskId,
          timestamp: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    
    const taskInfo = result.Item;
    
    // Build response based on task status
    let responseBody = {
      taskId,
      status: taskInfo.status,
      timestamp: new Date().toISOString()
    };
    
    // Add status-specific information
    if (taskInfo.status === 'completed' || taskInfo.status === 'error') {
      responseBody = {
        ...responseBody,
        completedAt: taskInfo.completedAt,
        result: taskInfo.result,
        error: taskInfo.error
      };
    } else {
      responseBody = {
        ...responseBody,
        progress: taskInfo.progress,
        startedAt: taskInfo.startTime,
        message: taskInfo.message
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error(`Error getting task ${taskId} status:`, error);
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
 * List tasks with filtering options
 */
async function listTasks(queryParams) {
  try {
    const limit = parseInt(queryParams.limit || process.env.LIST_LIMIT || '100', 10);
    const status = queryParams.status || null;
    const startKey = queryParams.startKey ? JSON.parse(queryParams.startKey) : null;
    
    let queryParams = {
      TableName: process.env.DYNAMODB_TASK_TABLE,
      Limit: limit
    };
    
    // Add pagination if a start key is provided
    if (startKey) {
      queryParams.ExclusiveStartKey = startKey;
    }
    
    // Query by status if provided
    if (status) {
      queryParams = {
        ...queryParams,
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'status = :status',
        ExpressionAttributeValues: {
          ':status': status
        }
      };
      
      const result = await dynamoDB.send(new QueryCommand(queryParams));
      
      // Transform results
      const tasks = result.Items.map(item => ({
        taskId: item.taskId,
        status: item.status,
        progress: item.progress,
        startTime: item.startTime,
        completedAt: item.completedAt,
        lastUpdated: item.lastUpdated,
        task_name: item.task_name
      }));
      
      // Build response
      const response = {
        tasks,
        count: tasks.length,
        timestamp: new Date().toISOString()
      };
      
      // Add pagination token if more results exist
      if (result.LastEvaluatedKey) {
        response.nextKey = JSON.stringify(result.LastEvaluatedKey);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      // No status provided, scan the table
      const result = await dynamoDB.send(new QueryCommand(queryParams));
      
      // Group by status
      const running = [];
      const completed = [];
      
      result.Items.forEach(item => {
        const baseInfo = {
          taskId: item.taskId,
          task_name: item.task_name,
          lastUpdated: item.lastUpdated
        };
        
        if (['running', 'processing', 'submitted', 'initializing'].includes(item.status)) {
          running.push({
            ...baseInfo,
            status: item.status,
            startTime: item.startTime,
            progress: item.progress
          });
        } else {
          completed.push({
            ...baseInfo,
            status: item.status,
            completedAt: item.completedAt
          });
        }
      });
      
      // Build response
      const response = {
        running,
        completed,
        timestamp: new Date().toISOString()
      };
      
      // Add pagination token if more results exist
      if (result.LastEvaluatedKey) {
        response.nextKey = JSON.stringify(result.LastEvaluatedKey);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify(response),
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