import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'ai-generations' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadBase64(base64Data: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<string> {
    console.log('☁️  [Cloudinary] Starting base64 upload...');
    console.log('📦 [Cloudinary] Resource type:', resourceType);
    console.log('📏 [Cloudinary] Data length:', base64Data.length);
    
    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'ai-generations',
        resource_type: resourceType,
      });
      
      console.log('✅ [Cloudinary] Upload successful!');
      console.log('🔗 [Cloudinary] URL:', result.secure_url);
      
      return result.secure_url;
    } catch (error) {
      console.error('💥 [Cloudinary] Upload failed:', error);
      throw error;
    }
  }

  async uploadBuffer(buffer: Buffer, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<string> {
    console.log('☁️  [Cloudinary] Starting buffer upload...');
    console.log('📦 [Cloudinary] Resource type:', resourceType);
    console.log('📏 [Cloudinary] Buffer size:', buffer.length, 'bytes');
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'ai-generations', 
          resource_type: resourceType,
          // For raw files, don't specify format - let Cloudinary detect
        },
        (error, result) => {
          if (error) {
            console.error('💥 [Cloudinary] Buffer upload failed:', error);
            reject(error);
          } else {
            console.log('✅ [Cloudinary] Buffer upload successful!');
            console.log('🔗 [Cloudinary] URL:', result.secure_url);
            resolve(result.secure_url);
          }
        },
      );
      uploadStream.end(buffer);
    });
  }
}
