# Serverless Deployment Guide for SmartRPA with AdsPower

This guide explains how to deploy the SmartRPA background service using AdsPower fingerprint browsers on various serverless platforms.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
   - [AWS Lambda + API Gateway](#aws-lambda--api-gateway)
   - [Google Cloud Run](#google-cloud-run)
4. [Environment Variables](#environment-variables)
5. [AdsPower Integration](#adspower-integration)
6. [State Management](#state-management)
7. [Handling Long-Running Tasks](#handling-long-running-tasks)
8. [Troubleshooting](#troubleshooting)

## Overview

The SmartRPA background service can be deployed on serverless platforms, integrating with AdsPower's fingerprint browsers for web automation tasks. This approach provides scalability, cost efficiency, and simplified management compared to traditional server deployments.

## Prerequisites

- Node.js 16+ and npm
- AWS account (for AWS deployment) or Google Cloud account (for GCP deployment)
- AdsPower account with API access
- Serverless Framework CLI installed (for AWS Lambda deployment)

## Deployment Options

### AWS Lambda + API Gateway

AWS Lambda is ideal for handling individual API requests and processing shorter automation tasks.

#### Setup

1. **Install dependencies:**
   ```bash
   npm install -g serverless
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY
   ```

3. **Edit environment variables:**
   Update the environment variables in `aws-lambda/serverless.yml` with your AdsPower API settings.

4. **Deploy:**
   ```bash
   cd aws-lambda
   serverless deploy --stage prod --region us-east-1
   ```

#### Architecture

The AWS deployment consists of:
- API Gateway endpoints for handling HTTP requests
- Lambda functions for API handling, task launching, and status checking
- DynamoDB for task state persistence
- S3 for storing task results and data
- SQS for task queuing and background processing

The deployment creates these resources automatically via the serverless.yml configuration.

### Google Cloud Run

Google Cloud Run is better suited for longer-running automation tasks as it provides more runtime flexibility.

#### Setup

1. **Install Google Cloud SDK:**
   Follow the [official instructions](https://cloud.google.com/sdk/docs/install).

2. **Initialize GCP:**
   ```bash
   gcloud init
   ```

3. **Enable required APIs:**
   ```bash
   gcloud services enable run.googleapis.com firestore.googleapis.com storage.googleapis.com
   ```

4. **Build and deploy the container:**
   ```bash
   cd cloud-run
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/smartrpa
   ```

5. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy smartrpa \
     --image gcr.io/YOUR_PROJECT_ID/smartrpa \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="ADSPOWER_API_URL=YOUR_API_URL,ADSPOWER_API_KEY=YOUR_API_KEY"
   ```

#### Architecture

The Google Cloud Run deployment includes:
- A containerized Node.js application
- Firestore for task state persistence
- Cloud Storage for task results and data
- Background processing using the same container

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| ADSPOWER_API_URL | URL for local AdsPower API | No | http://local.adspower.net:50325 |
| ADSPOWER_REMOTE_API_URL | URL for remote AdsPower API | No | - |
| ADSPOWER_API_KEY | API key for AdsPower | Yes | - |
| ADSPOWER_DEFAULT_USER_ID | Default browser profile ID | No | kn8o287 |
| ADSPOWER_HEADLESS | Run browser in headless mode | No | true |
| ADSPOWER_TIMEOUT | API request timeout (ms) | No | 60000 |

## AdsPower Integration

The project uses the `serverless-adsPower.js` module to interact with AdsPower browsers in a serverless environment:

1. **Remote vs Local API**
   - For serverless deployment, you must use a remote AdsPower API endpoint
   - Set the `ADSPOWER_REMOTE_API_URL` to your AdsPower API server address

2. **Browser Profiles**
   - Ensure your AdsPower browser profiles are accessible via the API
   - Specify the browser profile ID using `adsPowerUserId` in task requests

## State Management

Unlike the original application that stores task state in memory, the serverless version uses:

- **AWS**: DynamoDB for task state storage
- **GCP**: Firestore for task state storage

This ensures task state persists across function invocations and allows task monitoring from any instance.

## Handling Long-Running Tasks

Serverless environments have execution time limits:

- **AWS Lambda**: 15 minutes maximum
- **Google Cloud Run**: 60 minutes maximum

For tasks that might exceed these limits:

1. **Task Segmentation**: Break long tasks into smaller segments
2. **Progress Tracking**: Use the task progress APIs to track and resume tasks
3. **State Checkpoints**: Implement checkpointing for resumable tasks

## Troubleshooting

### Common Issues

1. **AdsPower Connection Errors**
   - Ensure your AdsPower API is publicly accessible
   - Check API key and permissions
   - Verify the browser profile exists and is properly configured

2. **Timeouts**
   - Long tasks may hit serverless execution limits
   - Consider breaking tasks into smaller steps
   - Use progress tracking to implement resumable tasks

3. **Memory Issues**
   - Increase memory allocation for Lambda functions or Cloud Run instances
   - Close browser resources properly after use

4. **Browser Launch Failures**
   - Check browser profile configuration
   - Ensure AdsPower service is running
   - Verify network connectivity between serverless environment and AdsPower API

For detailed logs:
- AWS: Check CloudWatch Logs
- GCP: Check Cloud Logging