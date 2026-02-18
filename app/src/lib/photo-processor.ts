// Photo processing service
// Extracts EXIF data and generates multiple sizes for responsive display

export interface PhotoExif {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  [key: string]: any; // Allow other EXIF fields
}

export interface PhotoProcessingResult {
  success: boolean;
  exif?: PhotoExif;
  error?: string;
}

/**
 * Extract EXIF data from photo
 * For MVP, returns basic structure
 * In production, use exif-reader or similar library
 * 
 * TODO: Implement actual EXIF extraction
 * This requires:
 * 1. Installing exif-reader or exif-js
 * 2. Reading EXIF from image buffer
 * 3. Parsing and returning structured data
 */
export async function extractPhotoExif(
  imageUrl: string,
  imageBuffer?: Buffer
): Promise<PhotoProcessingResult> {
  try {
    console.log(`📸 Extracting EXIF data from photo: ${imageUrl}`);

    // For MVP, return empty EXIF structure
    // In production, implement actual EXIF extraction:

    /*
    // Example implementation with exif-reader:
    const ExifReader = require('exif-reader');
    
    let buffer: Buffer;
    if (imageBuffer) {
      buffer = imageBuffer;
    } else {
      // Fetch image if not provided
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    // Extract EXIF
    const exif = ExifReader.load(buffer);
    
    const photoExif: PhotoExif = {
      camera: exif.Image?.Make && exif.Image?.Model 
        ? `${exif.Image.Make} ${exif.Image.Model}` 
        : undefined,
      iso: exif.Exif?.ISOSpeedRatings?.[0],
      aperture: exif.Exif?.FNumber ? `f/${exif.Exif.FNumber}` : undefined,
      shutterSpeed: exif.Exif?.ExposureTime ? `1/${1/exif.Exif.ExposureTime}s` : undefined,
      focalLength: exif.Exif?.FocalLength ? `${exif.Exif.FocalLength}mm` : undefined,
      dateTaken: exif.Exif?.DateTimeOriginal || exif.Image?.DateTime,
      location: exif.GPS?.Latitude && exif.GPS?.Longitude
        ? {
            latitude: exif.GPS.Latitude,
            longitude: exif.GPS.Longitude,
          }
        : undefined,
    };
    
    return {
      success: true,
      exif: photoExif,
    };
    */

    // MVP: Return empty EXIF structure
    console.log(`⚠️ EXIF extraction not implemented, returning empty structure`);
    return {
      success: true,
      exif: {},
    };
  } catch (error) {
    console.error('Photo EXIF extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate multiple sizes for responsive photo display
 * Returns URLs for thumbnail, medium, and large sizes
 * 
 * TODO: Implement actual image resizing
 * This requires:
 * 1. Installing sharp or similar image processing library
 * 2. Resizing image to multiple sizes
 * 3. Uploading to R2
 * 4. Returning URLs
 */
export async function generatePhotoSizes(
  imageKey: string,
  imageUrl: string
): Promise<{
  thumbnail?: string;
  medium?: string;
  large?: string;
}> {
  try {
    console.log(`📸 Generating multiple sizes for photo: ${imageKey}`);

    // For MVP, return original URL for all sizes
    // In production, implement actual resizing:

    /*
    // Example implementation with sharp:
    const sharp = require('sharp');
    const { getR2Client, PutObjectCommand, GetObjectCommand } = require('@/lib/storage/r2-client');
    
    // Download original image
    const s3Client = getR2Client();
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'parallax-library',
      Key: imageKey,
    });
    const imageResponse = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(imageResponse.Body);
    
    // Generate sizes
    const sizes = {
      thumbnail: { width: 300, height: 300 },
      medium: { width: 800, height: 800 },
      large: { width: 1920, height: 1920 },
    };
    
    const results: { [key: string]: string } = {};
    
    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      const resizedBuffer = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const resizedKey = imageKey.replace(/\.(jpg|jpeg|png)$/, `_${sizeName}.jpg`);
      const putCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'parallax-library',
        Key: resizedKey,
        Body: resizedBuffer,
        ContentType: 'image/jpeg',
      });
      await s3Client.send(putCommand);
      
      results[sizeName] = `${process.env.R2_PUBLIC_URL}/${resizedKey}`;
    }
    
    return results;
    */

    // MVP: Return original URL for all sizes
    console.log(`⚠️ Photo resizing not implemented, using original URL`);
    return {
      thumbnail: imageUrl,
      medium: imageUrl,
      large: imageUrl,
    };
  } catch (error) {
    console.error('Photo size generation error:', error);
    return {};
  }
}

