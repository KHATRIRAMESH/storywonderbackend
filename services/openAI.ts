import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { gcsService } from './gcsService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  async generateStory(
    childName: string,
    childAge: number,
    interests: string,
    pageCount: number = 10,
  ) {
    try {
      const prompt = `Create a magical children's story for ${childName}, age ${childAge}, who loves ${interests}. 
      The story should be ${pageCount} pages long and include adventure, friendship, and valuable life lessons.
      
      Return a JSON object with:
      - title: The story title
      - pages: Array of ${pageCount} pages, each with "text" and "imagePrompt" fields
      - coverImagePrompt: Description for the cover illustration
      
      Make it age-appropriate, engaging, and magical.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Latest model
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No content generated');

      return JSON.parse(content);
    } catch (error: any) {
      console.error('Story generation error:', error);
      throw new Error(`Failed to generate story: ${error.message}`);
    }
  }

  private sanitizeImagePrompt(prompt: string): string {
    // Remove potentially problematic words and replace with safe alternatives
    const safeMappings = {
      weapon: 'toy',
      sword: 'magic wand',
      gun: 'water squirter',
      knife: 'utensil',
      fight: 'play',
      battle: 'adventure',
      war: 'game',
      kill: 'help',
      death: 'sleep',
      dead: 'resting',
      blood: 'red paint',
      violence: 'fun',
      scary: 'exciting',
      frightening: 'mysterious',
    };

    let sanitized = prompt.toLowerCase();
    for (const [bad, good] of Object.entries(safeMappings)) {
      sanitized = sanitized.replace(new RegExp(bad, 'gi'), good);
    }

    return sanitized;
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      // First attempt with sanitized prompt
      const sanitizedPrompt = this.sanitizeImagePrompt(prompt);
      const safePrompt = `Cute children's book illustration: ${sanitizedPrompt}. Colorful, whimsical, friendly characters, cartoon style, safe for all ages, bright and cheerful.`;

      console.log(
        `🎨 Generating image with prompt: ${safePrompt.substring(0, 100)}...`,
      );

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: safePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      const imageUrl = response.data?.[0]?.url;
      if (imageUrl) {
        console.log(`✅ Image generated successfully`);
        return imageUrl;
      }

      throw new Error('No image URL returned');
    } catch (error: any) {
      console.error('Primary image generation failed:', error.message);

      // If content policy violation, try with extremely safe fallback
      if (
        error.message?.includes('content_policy_violation') ||
        error.message?.includes('content filters')
      ) {
        console.log('🔄 Trying fallback safe image generation...');

        try {
          const ultraSafePrompt = `Happy cartoon illustration for children: cute animals in a magical garden with flowers and rainbows. Bright colors, friendly faces, storybook art style.`;

          const fallbackResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: ultraSafePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          });

          const fallbackUrl = fallbackResponse.data?.[0]?.url;
          if (fallbackUrl) {
            console.log(`✅ Fallback image generated successfully`);
            return fallbackUrl;
          }
        } catch (fallbackError) {
          console.error(
            'Fallback image generation also failed:',
            fallbackError,
          );
        }
      }

      // If all fails, return placeholder
      console.log('🎨 Using placeholder image for content policy compliance');
      return 'https://via.placeholder.com/1024x1024/87CEEB/FFFFFF?text=Story+Illustration';
    }
  }
}

export const openaiService = new OpenAIService();

import pool from '../config/database';
