import 'server-only';
import { 
  S3Client, 
  DeleteObjectCommand, 
  CopyObjectCommand, 
  PutObjectCommand,
  GetObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Server-only R2 client factory
 * This prevents AWS SDK from leaking into the client bundle
 */
export function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Re-export AWS SDK commands and utilities for convenience
 * All imports remain server-only
 */
export { 
  DeleteObjectCommand, 
  CopyObjectCommand, 
  PutObjectCommand,
  GetObjectCommand,
  getSignedUrl 
};
