import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { gcsService } from '../services/gcsService';

// Define the GCS service type
type GCSServiceType = typeof gcsService;

// Custom multer storage engine for GCS
class GCSStorage {
  private gcsService: GCSServiceType;

  constructor(gcsServiceInstance: GCSServiceType) {
    this.gcsService = gcsServiceInstance;
  }

  _handleFile(req: any, file: Express.Multer.File, cb: Function) {
    // Generate unique path for the uploaded file
    const userId = req.userId || 'anonymous';
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const gcsPath = this.gcsService.generateUserUploadPath(userId, filename);

    // Collect the file data
    const chunks: Buffer[] = [];
    
    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        if (!this.gcsService.isConfigured()) {
          // For development without GCS, save locally
          const localPath = `/uploads/${filename}`;
          console.log(`⚠️ GCS not configured, using local path: ${localPath}`);
          cb(null, {
            filename: filename,
            path: localPath,
            size: buffer.length,
            gcsUrl: null
          });
          return;
        }

        // Upload to GCS
        const gcsUrl = await this.gcsService.uploadBuffer(
          buffer, 
          gcsPath, 
          file.mimetype || 'image/jpeg'
        );

        console.log(`✅ File uploaded to GCS: ${gcsPath}`);

        cb(null, {
          filename: filename,
          path: gcsPath,
          size: buffer.length,
          gcsUrl: gcsUrl
        });

      } catch (error) {
        console.error('Error uploading file to GCS:', error);
        cb(error);
      }
    });

    file.stream.on('error', (error: Error) => {
      cb(error);
    });
  }

  _removeFile(req: any, file: any, cb: Function) {
    // Optionally implement file cleanup
    if (file.path && this.gcsService.isConfigured()) {
      this.gcsService.deleteFile(file.path).then(() => {
        cb(null);
      }).catch((error: any) => {
        console.warn('Could not delete file from GCS:', error);
        cb(null); // Don't fail the request if cleanup fails
      });
    } else {
      cb(null);
    }
  }
}

// File filter for allowed file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  // Allow only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Create multer instance with GCS storage
const gcsStorage = new GCSStorage(gcsService);

export const uploadToGCS = multer({
  storage: gcsStorage as any,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  }
});

// Middleware for handling single file upload
export const uploadSingleImage = (fieldName: string = 'childImage') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const upload = uploadToGCS.single(fieldName);
    
    upload(req, res, (error: any) => {
      if (error) {
        console.error('File upload error:', error);
        
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
          }
          if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Only one file allowed.' });
          }
        }
        
        if (error.message.includes('Only image files')) {
          return res.status(400).json({ message: 'Only image files are allowed.' });
        }
        
        return res.status(500).json({ message: 'File upload failed.' });
      }
      
      // Add GCS URL to request object for easy access
      if (req.file && (req.file as any).gcsUrl) {
        (req as any).gcsFileUrl = (req.file as any).gcsUrl;
      }
      
      next();
    });
  };
};

// Middleware for handling multiple file uploads (for future use)
export const uploadMultipleImages = (fieldName: string = 'images', maxCount: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const upload = uploadToGCS.array(fieldName, maxCount);
    
    upload(req, res, (error: any) => {
      if (error) {
        console.error('Multiple file upload error:', error);
        
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'One or more files are too large. Maximum size is 10MB per file.' });
          }
          if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: `Too many files. Maximum ${maxCount} files allowed.` });
          }
        }
        
        if (error.message.includes('Only image files')) {
          return res.status(400).json({ message: 'Only image files are allowed.' });
        }
        
        return res.status(500).json({ message: 'File upload failed.' });
      }
      
      // Add GCS URLs to request object
      if (req.files && Array.isArray(req.files)) {
        (req as any).gcsFileUrls = req.files.map((file: any) => file.gcsUrl).filter(Boolean);
      }
      
      next();
    });
  };
};
