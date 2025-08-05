#!/usr/bin/env ts-node

/**
 * Migration script to move existing local story assets to Google Cloud Storage
 * 
 * This script will:
 * 1. Find all stories with local file paths in the database
 * 2. Upload those files to GCS
 * 3. Update the database with new GCS URLs
 * 4. Optionally clean up local files after successful migration
 * 
 * Usage:
 * npm run migrate-to-gcs
 * or
 * npx ts-node scripts/migrate-to-gcs.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db/config';
import { stories, storyPages } from '../db/schema';
import { gcsService } from '../services/gcsService';
import { eq } from 'drizzle-orm';

interface MigrationStats {
  storiesProcessed: number;
  storiesSkipped: number;
  pagesProcessed: number;
  pagesSkipped: number;
  errors: Array<{
    type: 'story' | 'page';
    id: number;
    error: string;
  }>;
}

class AssetMigrationService {
  private stats: MigrationStats = {
    storiesProcessed: 0,
    storiesSkipped: 0,
    pagesProcessed: 0,
    pagesSkipped: 0,
    errors: []
  };

  private isDryRun: boolean;
  private cleanupAfterMigration: boolean;

  constructor(isDryRun: boolean = false, cleanupAfterMigration: boolean = false) {
    this.isDryRun = isDryRun;
    this.cleanupAfterMigration = cleanupAfterMigration;
  }

  async migrateAllAssets(): Promise<void> {
    console.log('🚀 Starting asset migration to Google Cloud Storage...');
    console.log(`📋 Mode: ${this.isDryRun ? 'DRY RUN' : 'ACTUAL MIGRATION'}`);
    console.log(`🧹 Cleanup after migration: ${this.cleanupAfterMigration ? 'YES' : 'NO'}`);
    
    if (!gcsService.isConfigured()) {
      console.error('❌ GCS is not configured. Please set up GCS environment variables.');
      return;
    }

    // Test GCS connection
    const isConnected = await gcsService.testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to GCS. Please check your configuration.');
      return;
    }

    console.log('✅ GCS connection verified');
    console.log('');

    // Migrate story assets (thumbnails, PDFs, child images)
    await this.migrateStoryAssets();
    
    // Migrate page images
    await this.migratePageAssets();

    // Print summary
    this.printMigrationSummary();
  }

  private async migrateStoryAssets(): Promise<void> {
    console.log('📚 Migrating story assets...');

    try {
      const allStories = await db.select().from(stories);
      console.log(`Found ${allStories.length} stories to check`);

      for (const story of allStories) {
        try {
          let updated = false;
          const updates: any = {};

          // Migrate thumbnail image
          if (story.thumbnailUrl && this.isLocalPath(story.thumbnailUrl)) {
            const newThumbnailUrl = await this.migrateFile(
              story.thumbnailUrl,
              gcsService.generateAssetPath(story.id, story.userId, 'thumbnails', 'cover.png'),
              'image/png'
            );
            if (newThumbnailUrl) {
              updates.thumbnailUrl = newThumbnailUrl;
              updated = true;
            }
          }

          // Migrate child image
          if (story.childImageUrl && this.isLocalPath(story.childImageUrl)) {
            const newChildImageUrl = await this.migrateFile(
              story.childImageUrl,
              gcsService.generateUserUploadPath(story.userId, 'child_image.jpg'),
              'image/jpeg'
            );
            if (newChildImageUrl) {
              updates.childImageUrl = newChildImageUrl;
              updated = true;
            }
          }

          // Migrate PDF
          if (story.pdfUrl && this.isLocalPath(story.pdfUrl)) {
            const newPdfUrl = await this.migrateFile(
              story.pdfUrl,
              gcsService.generateAssetPath(story.id, story.userId, 'pdf', 'story.pdf'),
              'application/pdf'
            );
            if (newPdfUrl) {
              updates.pdfUrl = newPdfUrl;
              updated = true;
            }
          }

          // Update database
          if (updated && !this.isDryRun) {
            await db
              .update(stories)
              .set({
                ...updates,
                updatedAt: new Date()
              })
              .where(eq(stories.id, story.id));
          }

          if (updated) {
            this.stats.storiesProcessed++;
            console.log(`✅ Story ${story.id}: ${story.title} - migrated ${Object.keys(updates).length} assets`);
          } else {
            this.stats.storiesSkipped++;
          }

        } catch (error) {
          this.stats.errors.push({
            type: 'story',
            id: story.id,
            error: (error as Error).message
          });
          console.error(`❌ Error migrating story ${story.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error during story asset migration:', error);
    }
  }

  private async migratePageAssets(): Promise<void> {
    console.log('📄 Migrating page assets...');

    try {
      const allPages = await db.select().from(storyPages);
      console.log(`Found ${allPages.length} pages to check`);

      for (const page of allPages) {
        try {
          if (page.imageUrl && this.isLocalPath(page.imageUrl)) {
            // Get story to get userId for path generation
            const storyData = await db
              .select({ userId: stories.userId })
              .from(stories)
              .where(eq(stories.id, page.storyId))
              .limit(1);

            if (storyData.length === 0) {
              console.warn(`⚠️ Could not find story ${page.storyId} for page ${page.id}`);
              continue;
            }

            const userId = storyData[0].userId;
            const newImageUrl = await this.migrateFile(
              page.imageUrl,
              gcsService.generateAssetPath(page.storyId, userId, 'pages', `page_${page.pageNumber}.png`),
              'image/png'
            );

            if (newImageUrl && !this.isDryRun) {
              await db
                .update(storyPages)
                .set({
                  imageUrl: newImageUrl,
                  updatedAt: new Date()
                })
                .where(eq(storyPages.id, page.id));
            }

            if (newImageUrl) {
              this.stats.pagesProcessed++;
              console.log(`✅ Page ${page.id} (Story ${page.storyId}, Page ${page.pageNumber}) - migrated image`);
            } else {
              this.stats.pagesSkipped++;
            }
          } else {
            this.stats.pagesSkipped++;
          }

        } catch (error) {
          this.stats.errors.push({
            type: 'page',
            id: page.id,
            error: (error as Error).message
          });
          console.error(`❌ Error migrating page ${page.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error during page asset migration:', error);
    }
  }

  private async migrateFile(localPath: string, gcsPath: string, contentType: string): Promise<string | null> {
    try {
      const fullPath = this.resolveLocalPath(localPath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Local file not found: ${fullPath}`);
        return null;
      }

      if (this.isDryRun) {
        console.log(`[DRY RUN] Would migrate: ${localPath} -> ${gcsPath}`);
        return gcsPath; // Return the path that would be used
      }

      const buffer = fs.readFileSync(fullPath);
      const gcsUrl = await gcsService.uploadBuffer(buffer, gcsPath, contentType);

      // Clean up local file if requested
      if (this.cleanupAfterMigration) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Cleaned up local file: ${fullPath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Could not clean up local file ${fullPath}:`, cleanupError);
        }
      }

      return gcsUrl;

    } catch (error) {
      console.error(`❌ Error migrating file ${localPath}:`, error);
      return null;
    }
  }

  private isLocalPath(filePath: string): boolean {
    // Check if it's a local file path (not a URL)
    return !!(filePath && 
           !filePath.startsWith('http://') && 
           !filePath.startsWith('https://') &&
           !filePath.includes('googleapis.com') &&
           !filePath.includes('storage.cloud.google.com'));
  }

  private resolveLocalPath(filePath: string): string {
    // Handle relative paths from public directory
    if (filePath.startsWith('/uploads/') || filePath.startsWith('/generated-pdfs/')) {
      return path.join(process.cwd(), 'public', filePath);
    }
    
    // Handle absolute paths
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Handle relative paths
    return path.join(process.cwd(), filePath);
  }

  private printMigrationSummary(): void {
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 Stories processed: ${this.stats.storiesProcessed}`);
    console.log(`📚 Stories skipped: ${this.stats.storiesSkipped}`);
    console.log(`📄 Pages processed: ${this.stats.pagesProcessed}`);
    console.log(`📄 Pages skipped: ${this.stats.pagesSkipped}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type} ${error.id}: ${error.error}`);
      });
    }

    console.log('');
    if (this.isDryRun) {
      console.log('💡 This was a dry run. To perform actual migration, run without --dry-run flag');
    } else {
      console.log('✅ Migration completed!');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const cleanupAfterMigration = args.includes('--cleanup');

  const migrationService = new AssetMigrationService(isDryRun, cleanupAfterMigration);
  
  try {
    await migrationService.migrateAllAssets();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { AssetMigrationService };
