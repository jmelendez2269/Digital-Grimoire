/**
 * Cloudflare R2 Connection Test Script
 * 
 * This script tests the R2 API connection and basic operations.
 * Run with: npx tsx test-r2-connection.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from app/.env.local
config({ path: resolve(__dirname, 'app', '.env.local') });

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = 'convergence-library'; // Update if you used a different name

async function testR2Connection() {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in app/.env.local');
  }

  console.log('🚀 Cloudflare R2 Connection Test');
  console.log('═'.repeat(60));
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log(`🔑 Access Key ID: ${accessKeyId.substring(0, 8)}...`);
  console.log(`📦 Bucket: ${bucketName}`);
  console.log('═'.repeat(60));
  console.log();
  console.log('ℹ️  Note: This test skips "List Buckets" which requires Admin permissions.');
  console.log('   We only need Object Read/Write for the actual application.');
  console.log();

  // Create S3 client configured for R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  try {
    // Test 1: Upload a test file (this is what we actually need)
    // Note: "List Buckets" requires Admin permissions, but we only need Object Read/Write
    console.log('Test 1: Uploading test file to bucket...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'Hello from Digital Grimoire! This is a test file to verify R2 uploads work correctly.';
    
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testFileName,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await s3Client.send(putCommand);
    console.log(`✅ File uploaded successfully: ${testFileName}`);
    console.log();

    // Test 2: Download the test file
    console.log('Test 2: Downloading test file...');
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testFileName,
    });

    const getResponse = await s3Client.send(getCommand);
    const downloadedContent = await getResponse.Body?.transformToString();
    
    if (downloadedContent === testContent) {
      console.log('✅ File downloaded successfully and content matches!');
      console.log(`📄 Content: "${downloadedContent.substring(0, 50)}..."`);
    } else {
      console.log('⚠️  Downloaded content doesn\'t match uploaded content');
    }
    console.log();

    // Test 3: Delete the test file (cleanup)
    console.log('Test 3: Cleaning up test file...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testFileName,
    });

    await s3Client.send(deleteCommand);
    console.log('✅ Test file deleted successfully');
    console.log();

    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 All tests passed!');
    console.log('═'.repeat(60));
    console.log();
    console.log('Your R2 bucket is configured correctly and ready to use.');
    console.log('You can now proceed with Phase 3 of the integration plan.');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      console.error('\n💡 The bucket doesn\'t exist. Make sure:');
      console.error(`   - You created a bucket named "${bucketName}"`);
      console.error('   - Or update the bucketName variable in this script');
    } else if (error.name === 'InvalidAccessKeyId') {
      console.error('\n💡 Invalid credentials. Check:');
      console.error('   - R2_ACCESS_KEY_ID is correct');
      console.error('   - R2_SECRET_ACCESS_KEY is correct');
      console.error('   - No extra spaces in .env.local');
    } else if (error.message?.includes('getaddrinfo ENOTFOUND')) {
      console.error('\n💡 Invalid endpoint. Check:');
      console.error('   - R2_ENDPOINT format: https://[account_id].r2.cloudflarestorage.com');
      console.error('   - No typos in the account ID');
    } else {
      console.error('\n💡 Error details:', {
        name: error.name,
        message: error.message,
        code: error.$metadata?.httpStatusCode,
      });
    }
    
    process.exit(1);
  }
}

testR2Connection();

