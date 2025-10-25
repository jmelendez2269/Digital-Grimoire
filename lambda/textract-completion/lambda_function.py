"""
AWS Lambda Function: Textract Completion Handler
Triggered by SNS when Textract job completes
Retrieves OCR text and updates database
"""

import json
import os
import boto3
from supabase import create_client, Client

textract = boto3.client('textract')

# Supabase configuration
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_textract_results(job_id):
    """
    Retrieve all pages of Textract results
    """
    all_text = []
    next_token = None
    
    while True:
        if next_token:
            response = textract.get_document_text_detection(
                JobId=job_id,
                NextToken=next_token
            )
        else:
            response = textract.get_document_text_detection(JobId=job_id)
        
        # Extract text from blocks
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                all_text.append(block['Text'])
        
        # Check if there are more pages
        next_token = response.get('NextToken')
        if not next_token:
            break
    
    return '\n'.join(all_text)


def update_database(s3_key, content, status='ready'):
    """
    Update the texts table with OCR content
    """
    try:
        response = supabase.table('texts').update({
            'content': content,
            'status': status,
            'processed_at': 'now()'
        }).eq('s3_key', s3_key).execute()
        
        return response.data
    except Exception as e:
        print(f"Database update error: {str(e)}")
        raise


def lambda_handler(event, context):
    """
    Triggered by SNS when Textract job completes.
    Retrieves OCR text and updates database.
    """
    
    try:
        # Parse SNS message
        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            
            job_id = message['JobId']
            status = message['Status']
            
            print(f"Textract job {job_id} status: {status}")
            
            if status == 'SUCCEEDED':
                # Get OCR results
                content = get_textract_results(job_id)
                
                # Extract S3 key from job ID (we used it as ClientRequestToken)
                # In production, you'd store this mapping in a database
                s3_key = message.get('DocumentLocation', {}).get('S3ObjectName', '')
                
                print(f"Retrieved {len(content)} characters of text")
                
                # Update database
                update_database(s3_key, content, 'ready')
                
                print(f"Successfully processed {s3_key}")
                
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'OCR processing complete',
                        'jobId': job_id,
                        'textLength': len(content)
                    })
                }
            
            elif status == 'FAILED':
                # Update database with error status
                s3_key = message.get('DocumentLocation', {}).get('S3ObjectName', '')
                update_database(s3_key, '', 'error')
                
                print(f"Textract job failed for {s3_key}")
                
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'OCR processing failed',
                        'jobId': job_id
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
# supabase==2.3.0

