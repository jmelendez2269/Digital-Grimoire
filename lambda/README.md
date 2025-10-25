# Lambda Functions for Document Processing

This directory contains AWS Lambda functions for OCR and metadata extraction.

## Functions

### 1. textract-trigger
Triggered when a document is uploaded to S3. Starts an async Textract job for OCR.

**Trigger:** S3 upload event  
**Runtime:** Python 3.11  
**Memory:** 256MB  
**Timeout:** 30 seconds  

**Environment Variables:**
- `SNS_TOPIC_ARN` - ARN of SNS topic for Textract notifications
- `SNS_ROLE_ARN` - IAM role for Textract to publish to SNS

### 2. textract-completion
Triggered by SNS when Textract job completes. Retrieves OCR text and updates database.

**Trigger:** SNS notification  
**Runtime:** Python 3.11  
**Memory:** 512MB  
**Timeout:** 60 seconds  

**Environment Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (secret!)

## Deployment Steps

### Prerequisites
1. AWS CLI configured with appropriate credentials
2. S3 bucket created (`digital-grimoire-library`)
3. SNS topic created for Textract notifications
4. IAM roles created for Lambda execution

### Deploy textract-trigger

```bash
cd lambda/textract-trigger

# Install dependencies
pip install -r requirements.txt -t .

# Create deployment package
zip -r function.zip .

# Deploy to Lambda
aws lambda create-function \
  --function-name textract-trigger \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{SNS_TOPIC_ARN=YOUR_SNS_TOPIC_ARN,SNS_ROLE_ARN=YOUR_SNS_ROLE_ARN}"

# Add S3 trigger
aws lambda add-permission \
  --function-name textract-trigger \
  --statement-id s3-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::digital-grimoire-library

aws s3api put-bucket-notification-configuration \
  --bucket digital-grimoire-library \
  --notification-configuration file://s3-notification.json
```

### Deploy textract-completion

```bash
cd lambda/textract-completion

# Install dependencies
pip install -r requirements.txt -t .

# Create deployment package
zip -r function.zip .

# Deploy to Lambda
aws lambda create-function \
  --function-name textract-completion \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{SUPABASE_URL=YOUR_SUPABASE_URL,SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY}"

# Subscribe Lambda to SNS topic
aws sns subscribe \
  --topic-arn YOUR_SNS_TOPIC_ARN \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:textract-completion
```

## S3 Notification Configuration

Create `s3-notification.json`:

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:textract-trigger",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "uploads/"
            }
          ]
        }
      }
    }
  ]
}
```

## IAM Policies

### Lambda Execution Role
Attach these policies to your Lambda execution role:

1. **AWSLambdaBasicExecutionRole** (managed policy)
2. **Custom policy for S3 read:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::digital-grimoire-library",
        "arn:aws:s3:::digital-grimoire-library/*"
      ]
    }
  ]
}
```

3. **Custom policy for Textract:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:StartDocumentTextDetection",
        "textract:GetDocumentTextDetection"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "YOUR_SNS_TOPIC_ARN"
    }
  ]
}
```

## Monitoring

View logs in CloudWatch:
```bash
# Textract trigger logs
aws logs tail /aws/lambda/textract-trigger --follow

# Textract completion logs
aws logs tail /aws/lambda/textract-completion --follow
```

## Testing

Test locally with sample events:

```bash
# Test textract-trigger
aws lambda invoke \
  --function-name textract-trigger \
  --payload file://test-events/s3-event.json \
  response.json

# Test textract-completion
aws lambda invoke \
  --function-name textract-completion \
  --payload file://test-events/sns-event.json \
  response.json
```

## Costs (Estimate)

**Free Tier:**
- Lambda: 1M requests/month, 400K GB-seconds compute
- Textract: 1,000 pages for first 3 months
- S3: 5GB storage, 20K GET requests, 2K PUT requests

**After Free Tier:**
- Lambda: $0.20 per 1M requests + $0.0000166667 per GB-second
- Textract: $1.50 per 1,000 pages
- S3: $0.023 per GB/month

**Budget Alert:** Set up billing alarm at $10/month to avoid surprises!

