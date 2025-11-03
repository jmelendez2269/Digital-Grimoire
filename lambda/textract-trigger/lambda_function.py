"""
AWS Lambda Function: Textract Trigger
Triggered by S3 upload, starts Textract job for OCR processing
"""

import json
import os
import boto3
from urllib.parse import unquote_plus

textract = boto3.client('textract')
sns = boto3.client('sns')

SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']
SNS_ROLE_ARN = os.environ['SNS_ROLE_ARN']


def lambda_handler(event, context):
    """
    Triggered when a document is uploaded to S3.
    Starts an async Textract job for OCR processing.
    """
    
    try:
        # Parse S3 event
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = unquote_plus(record['s3']['object']['key'])
            
            print(f"Processing: s3://{bucket}/{key}")
            
            # Skip if not a supported file type (Textract doesn't process HTML)
            if not key.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
                print(f"Skipping unsupported file type: {key}")
                continue
            
            # Skip HTML files (Textract doesn't process HTML, and we handle HTML separately)
            if key.lower().endswith(('.html', '.htm')):
                print(f"Skipping HTML file (not processed by Textract): {key}")
                continue
            
            # Start Textract job
            response = textract.start_document_text_detection(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': bucket,
                        'Name': key
                    }
                },
                NotificationChannel={
                    'SNSTopicArn': SNS_TOPIC_ARN,
                    'RoleArn': SNS_ROLE_ARN
                },
                ClientRequestToken=key.replace('/', '-')[:64]  # Unique identifier
            )
            
            job_id = response['JobId']
            print(f"Started Textract job: {job_id} for {key}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Textract job started',
                    'jobId': job_id,
                    's3Key': key
                })
            }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }


# Deployment Requirements (requirements.txt):
# boto3==1.34.0

