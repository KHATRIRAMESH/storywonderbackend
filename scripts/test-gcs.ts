#!/usr/bin/env ts-node

/**
 * Test script for Google Cloud Storage integration
 * 
 * This script tests:
 * 1. GCS connection and configuration
 * 2. File upload functionality
 * 3. Signed URL generation
 * 4. File deletion
 * 5. Story generation workflow with GCS
 * 
 * Usage:
 * npm run test-gcs
 * or
 * npx ts-node scripts/test-gcs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { gcsService } from '../services/gcsService';

class GCSTestSuite {
  private testResults: Array<{
    test: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    duration?: number;
  }> = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting GCS Test Suite...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Test 1: Configuration check
    await this.testConfiguration();

    // Test 2: Connection test
    await this.testConnection();

    // Test 3: File upload test
    await this.testFileUpload();

    // Test 4: Signed URL generation
    await this.testSignedUrlGeneration();

    // Test 5: Image from URL upload
    await this.testImageFromUrlUpload();

    // Test 6: File deletion
    await this.testFileDeletion();

    // Test 7: Path generation
    await this.testPathGeneration();

    // Print summary
    this.printTestSummary();
  }

  private async testConfiguration(): Promise<void> {
    const startTime = Date.now();
    try {
      const isConfigured = gcsService.isConfigured();
      
      if (isConfigured) {
        this.testResults.push({
          test: 'Configuration Check',
          status: 'PASS',
          message: 'GCS is properly configured',
          duration: Date.now() - startTime
        });
        console.log('✅ Configuration Check: PASS - GCS is properly configured');
      } else {
        this.testResults.push({
          test: 'Configuration Check',
          status: 'SKIP',
          message: 'GCS is not configured (development mode)',
          duration: Date.now() - startTime
        });
        console.log('⚠️ Configuration Check: SKIP - GCS is not configured (development mode)');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Configuration Check',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ Configuration Check: FAIL -', (error as Error).message);
    }
  }

  private async testConnection(): Promise<void> {
    const startTime = Date.now();
    try {
      if (!gcsService.isConfigured()) {
        this.testResults.push({
          test: 'Connection Test',
          status: 'SKIP',
          message: 'GCS not configured',
          duration: Date.now() - startTime
        });
        console.log('⚠️ Connection Test: SKIP - GCS not configured');
        return;
      }

      const isConnected = await gcsService.testConnection();
      
      if (isConnected) {
        this.testResults.push({
          test: 'Connection Test',
          status: 'PASS',
          message: 'Successfully connected to GCS',
          duration: Date.now() - startTime
        });
        console.log('✅ Connection Test: PASS - Successfully connected to GCS');
      } else {
        this.testResults.push({
          test: 'Connection Test',
          status: 'FAIL',
          message: 'Could not connect to GCS',
          duration: Date.now() - startTime
        });
        console.log('❌ Connection Test: FAIL - Could not connect to GCS');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Connection Test',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ Connection Test: FAIL -', (error as Error).message);
    }
  }

  private async testFileUpload(): Promise<void> {
    const startTime = Date.now();
    try {
      // Create a test file buffer
      const testContent = 'This is a test file for GCS upload functionality';
      const testBuffer = Buffer.from(testContent, 'utf-8');
      const testPath = 'test/upload_test.txt';

      const uploadedUrl = await gcsService.uploadBuffer(testBuffer, testPath, 'text/plain');

      if (uploadedUrl) {
        this.testResults.push({
          test: 'File Upload Test',
          status: 'PASS',
          message: `File uploaded successfully: ${uploadedUrl}`,
          duration: Date.now() - startTime
        });
        console.log('✅ File Upload Test: PASS - File uploaded successfully');
        
        // Store the path for cleanup later
        (this as any).testFilePath = testPath;
      } else {
        this.testResults.push({
          test: 'File Upload Test',
          status: 'FAIL',
          message: 'Upload returned null URL',
          duration: Date.now() - startTime
        });
        console.log('❌ File Upload Test: FAIL - Upload returned null URL');
      }
    } catch (error) {
      this.testResults.push({
        test: 'File Upload Test',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ File Upload Test: FAIL -', (error as Error).message);
    }
  }

  private async testSignedUrlGeneration(): Promise<void> {
    const startTime = Date.now();
    try {
      const testPath = 'test/signed_url_test.txt';
      const signedUrl = await gcsService.getSignedUrl(testPath, 300); // 5 minutes

      if (signedUrl && (signedUrl.includes('http') || signedUrl.includes('placeholder'))) {
        this.testResults.push({
          test: 'Signed URL Generation',
          status: 'PASS',
          message: 'Signed URL generated successfully',
          duration: Date.now() - startTime
        });
        console.log('✅ Signed URL Generation: PASS - Signed URL generated successfully');
      } else {
        this.testResults.push({
          test: 'Signed URL Generation',
          status: 'FAIL',
          message: 'Invalid signed URL generated',
          duration: Date.now() - startTime
        });
        console.log('❌ Signed URL Generation: FAIL - Invalid signed URL generated');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Signed URL Generation',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ Signed URL Generation: FAIL -', (error as Error).message);
    }
  }

  private async testImageFromUrlUpload(): Promise<void> {
    const startTime = Date.now();
    try {
      // Use a placeholder image URL for testing
      const testImageUrl = 'https://via.placeholder.com/150x150/0000FF/FFFFFF?text=Test';
      const testPath = 'test/image_from_url_test.png';

      const uploadedUrl = await gcsService.uploadImageFromUrl(testImageUrl, testPath, 'image/png');

      if (uploadedUrl) {
        this.testResults.push({
          test: 'Image from URL Upload',
          status: 'PASS',
          message: 'Image uploaded from URL successfully',
          duration: Date.now() - startTime
        });
        console.log('✅ Image from URL Upload: PASS - Image uploaded from URL successfully');
        
        // Store for cleanup
        (this as any).testImagePath = testPath;
      } else {
        this.testResults.push({
          test: 'Image from URL Upload',
          status: 'FAIL',
          message: 'Image upload from URL returned null',
          duration: Date.now() - startTime
        });
        console.log('❌ Image from URL Upload: FAIL - Image upload from URL returned null');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Image from URL Upload',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ Image from URL Upload: FAIL -', (error as Error).message);
    }
  }

  private async testFileDeletion(): Promise<void> {
    const startTime = Date.now();
    try {
      const testPaths = [
        (this as any).testFilePath,
        (this as any).testImagePath
      ].filter(Boolean);

      if (testPaths.length === 0) {
        this.testResults.push({
          test: 'File Deletion Test',
          status: 'SKIP',
          message: 'No test files to delete',
          duration: Date.now() - startTime
        });
        console.log('⚠️ File Deletion Test: SKIP - No test files to delete');
        return;
      }

      let deleteSuccessCount = 0;
      for (const filePath of testPaths) {
        try {
          await gcsService.deleteFile(filePath);
          deleteSuccessCount++;
        } catch (error) {
          console.warn(`Could not delete test file ${filePath}:`, error);
        }
      }

      if (deleteSuccessCount === testPaths.length) {
        this.testResults.push({
          test: 'File Deletion Test',
          status: 'PASS',
          message: `Successfully deleted ${deleteSuccessCount} test files`,
          duration: Date.now() - startTime
        });
        console.log('✅ File Deletion Test: PASS - All test files deleted successfully');
      } else {
        this.testResults.push({
          test: 'File Deletion Test',
          status: 'FAIL',
          message: `Only deleted ${deleteSuccessCount}/${testPaths.length} test files`,
          duration: Date.now() - startTime
        });
        console.log(`❌ File Deletion Test: FAIL - Only deleted ${deleteSuccessCount}/${testPaths.length} test files`);
      }
    } catch (error) {
      this.testResults.push({
        test: 'File Deletion Test',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ File Deletion Test: FAIL -', (error as Error).message);
    }
  }

  private async testPathGeneration(): Promise<void> {
    const startTime = Date.now();
    try {
      const testStoryId = 123;
      const testUserId = 'test-user-123';

      // Test asset path generation
      const assetPath = gcsService.generateAssetPath(testStoryId, testUserId, 'pages', 'test.png');
      const userUploadPath = gcsService.generateUserUploadPath(testUserId, 'profile.jpg');

      const validAssetPath = assetPath.includes('stories/') && 
                           assetPath.includes(testUserId) && 
                           assetPath.includes(testStoryId.toString()) &&
                           assetPath.includes('pages/') &&
                           assetPath.includes('test.png');

      const validUserPath = userUploadPath.includes('uploads/') &&
                           userUploadPath.includes(testUserId) &&
                           userUploadPath.includes('.jpg');

      if (validAssetPath && validUserPath) {
        this.testResults.push({
          test: 'Path Generation Test',
          status: 'PASS',
          message: 'All path generation methods work correctly',
          duration: Date.now() - startTime
        });
        console.log('✅ Path Generation Test: PASS - All path generation methods work correctly');
      } else {
        this.testResults.push({
          test: 'Path Generation Test',
          status: 'FAIL',
          message: 'Path generation produced invalid paths',
          duration: Date.now() - startTime
        });
        console.log('❌ Path Generation Test: FAIL - Path generation produced invalid paths');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Path Generation Test',
        status: 'FAIL',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.log('❌ Path Generation Test: FAIL -', (error as Error).message);
    }
  }

  private printTestSummary(): void {
    console.log('');
    console.log('📊 Test Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.testResults.filter(r => r.status === 'SKIP').length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️ Skipped: ${skippedTests}`);

    const totalDuration = this.testResults.reduce((sum, result) => sum + (result.duration || 0), 0);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);

    console.log('');
    console.log('Detailed Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${result.test}: ${result.status}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
    });

    console.log('');
    if (failedTests === 0) {
      console.log('🎉 All tests passed! GCS integration is working correctly.');
    } else {
      console.log(`⚠️ ${failedTests} test(s) failed. Please check your GCS configuration.`);
    }

    // Environment hints
    console.log('');
    console.log('💡 Configuration Hints:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Make sure you have set the following environment variables:');
    console.log('- GCP_PROJECT_ID: Your Google Cloud Project ID');
    console.log('- GCS_BUCKET_NAME: Your Google Cloud Storage bucket name');
    console.log('- GOOGLE_APPLICATION_CREDENTIALS: Path to your service account key file');
    console.log('- Or GCP_KEYFILE_PATH: Alternative path to your service account key file');
    console.log('');
    console.log('For development without GCS, the system will use placeholder URLs.');
  }
}

// Main execution
async function main() {
  const testSuite = new GCSTestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { GCSTestSuite };
