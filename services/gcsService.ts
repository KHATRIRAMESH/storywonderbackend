import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class GCSService {
  private storage: Storage;
  private bucketName: string;
  private bucket: any;

  constructor() {
    // Initialize Google Cloud Storage
    const projectId = process.env.GCP_PROJECT_ID;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_KEYFILE_PATH;
    
    if (!projectId) {
      console.warn('⚠️ GCS not configured: Missing GCP_PROJECT_ID. Using placeholder URLs for development.');
      this.storage = null as any;
      this.bucketName = '';
      this.bucket = null;
      return;
    }

    // Handle JSON credentials directly from environment variable
    let storageConfig: any = { projectId };
    
    if (keyFilename) {
      // Check if keyFilename is a JSON string or a file path
      if (keyFilename.startsWith('{')) {
        try {
          // Parse JSON credentials directly
          const credentials = JSON.parse(keyFilename);
          storageConfig.credentials = credentials;
          console.log('📦 Using JSON credentials from environment variable');
        } catch (error) {
          console.error('❌ Failed to parse JSON credentials:', error);
          this.storage = null as any;
          this.bucketName = '';
          this.bucket = null;
          return;
        }
      } else {
        // Use file path
        storageConfig.keyFilename = keyFilename;
        console.log('📦 Using credentials file:', keyFilename);
      }
    } else {
      console.warn('⚠️ GCS not configured: Missing credentials. Using placeholder URLs for development.');
      this.storage = null as any;
      this.bucketName = '';
      this.bucket = null;
      return;
    }

    try {
      this.storage = new Storage(storageConfig);
      this.bucketName = process.env.GCS_BUCKET_NAME || '';
      
      if (!this.bucketName) {
        console.warn('⚠️ GCS not configured: Missing GCS_BUCKET_NAME. Using placeholder URLs for development.');
        this.storage = null as any;
        this.bucket = null;
        return;
      }
      
      this.bucket = this.storage.bucket(this.bucketName);
      console.log(`📦 GCS Service initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      console.error('❌ Failed to initialize GCS:', error);
      this.storage = null as any;
      this.bucketName = '';
      this.bucket = null;
    }
  }

  /**
   * Upload a buffer to Google Cloud Storage
   * @param buffer The file buffer to upload
   * @param destinationPath The path in the bucket where the file will be stored
   * @param contentType The MIME type of the file
   * @param makePublic Whether to make the file publicly accessible (default: false)
   * @returns Promise<string> The URL to access the uploaded file
   */
  async uploadBuffer(
    buffer: Buffer, 
    destinationPath: string, 
    contentType: string,
    makePublic: boolean = false
  ): Promise<string> {
    if (!this.storage || !this.bucket) {
      // Return placeholder URL for development
      console.log(`📦 GCS not configured, returning placeholder for: ${destinationPath}`);
      return `https://placeholder.com/${destinationPath}`;
    }

    try {
      const file = this.bucket.file(destinationPath);
      
      const stream = file.createWriteStream({
        metadata: {
          contentType,
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error: Error) => {
          console.error(`❌ GCS upload failed for ${destinationPath}:`, error);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            if (makePublic) {
              await file.makePublic();
              const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;
              console.log(`✅ File uploaded and made public: ${publicUrl}`);
              resolve(publicUrl);
            } else {
              // Generate a signed URL that expires in 24 hours for private files
              const signedUrl = await this.getSignedUrl(destinationPath, 24 * 60 * 60);
              console.log(`✅ File uploaded with signed URL: ${destinationPath}`);
              resolve(signedUrl);
            }
          } catch (error) {
            console.error(`❌ Error processing uploaded file ${destinationPath}:`, error);
            reject(error);
          }
        });

        stream.end(buffer);
      });
    } catch (error) {
      console.error(`❌ GCS upload error for ${destinationPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for a file in GCS
   * @param objectPath The path to the object in the bucket
   * @param expiresInSeconds How long the URL should be valid (default: 10 minutes)
   * @returns Promise<string> The signed URL
   */
  async getSignedUrl(objectPath: string, expiresInSeconds: number = 10 * 60): Promise<string> {
    if (!this.storage || !this.bucket) {
      // Return placeholder URL for development
      return `https://placeholder.com/${objectPath}`;
    }

    try {
      const file = this.bucket.file(objectPath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
      });
      
      return url;
    } catch (error) {
      console.error(`❌ Error generating signed URL for ${objectPath}:`, error);
      throw error;
    }
  }

  /**
   * Download an image from a URL and upload it to GCS
   * @param imageUrl The URL of the image to download
   * @param destinationPath The path in GCS where the image will be stored
   * @param contentType The content type of the image (default: 'image/png')
   * @returns Promise<string> The GCS URL for the uploaded image
   */
  async uploadImageFromUrl(
    imageUrl: string, 
    destinationPath: string, 
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      console.log(`📥 Downloading image from: ${imageUrl}`);
      
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`📤 Uploading image to GCS: ${destinationPath}`);
      
      // Upload to GCS
      return await this.uploadBuffer(buffer, destinationPath, contentType, false);
    } catch (error) {
      console.error(`❌ Error uploading image from URL ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique file path for story assets
   * @param storyId The story ID
   * @param userId The user ID
   * @param type The type of asset ('pages', 'pdf', 'characters', 'thumbnails')
   * @param filename The filename with extension
   * @returns string The generated path
   */
  generateAssetPath(storyId: number, userId: string, type: 'pages' | 'pdf' | 'characters' | 'thumbnails', filename: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    return `stories/${userId}/${storyId}/${type}/${timestamp}_${uniqueId}_${filename}`;
  }

  /**
   * Generate a unique file path for uploaded user images (child photos)
   * @param userId The user ID
   * @param originalFilename The original filename
   * @returns string The generated path
   */
  generateUserUploadPath(userId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const extension = path.extname(originalFilename);
    return `uploads/${userId}/${timestamp}_${uniqueId}${extension}`;
  }

  /**
   * Delete a file from GCS
   * @param objectPath The path to the object in the bucket
   * @returns Promise<void>
   */
  async deleteFile(objectPath: string): Promise<void> {
    if (!this.storage || !this.bucket) {
      console.log(`📦 GCS not configured, skipping delete for: ${objectPath}`);
      return;
    }

    try {
      const file = this.bucket.file(objectPath);
      await file.delete();
      console.log(`🗑️ Deleted file from GCS: ${objectPath}`);
    } catch (error) {
      console.error(`❌ Error deleting file ${objectPath}:`, error);
      // Don't throw error for delete operations - log and continue
    }
  }

  /**
   * Check if GCS is properly configured
   * @returns boolean True if GCS is configured and ready to use
   */
  isConfigured(): boolean {
    return !!(this.storage && this.bucket && this.bucketName);
  }

  /**
   * Test GCS connection by attempting to list bucket metadata
   * @returns Promise<boolean> True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.bucket.getMetadata();
      console.log(`✅ GCS connection test successful for bucket: ${this.bucketName}`);
      return true;
    } catch (error) {
      console.error(`❌ GCS connection test failed:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const gcsService = new GCSService();
