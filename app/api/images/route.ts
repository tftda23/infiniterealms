import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import * as settingsService from '@/lib/services/settings-service';

const SUPPORTED_FORMATS = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Schema for multipart form upload
const uploadFormSchema = z.object({
  type: z.enum(['avatar', 'scene', 'npc', 'item', 'map']),
  campaignId: z.string().optional(),
});

// Schema for remote URL download
const downloadUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
  type: z.enum(['avatar', 'scene', 'npc', 'item', 'map']),
  campaignId: z.string().optional(),
});

// Schema for query parameters (listing/filtering)
const listQuerySchema = z.object({
  type: z.enum(['avatar', 'scene', 'npc', 'item', 'map']).optional(),
  campaignId: z.string().optional(),
});

async function getStoragePath(): Promise<string> {
  try {
    const settings = await settingsService.getSettings(false);
    const customPath = (settings as any).imageStoragePath;
    if (customPath) {
      return customPath;
    }
  } catch (error) {
    console.warn('Could not fetch custom storage path:', error);
  }
  // Default to ./public/images
  return path.join(process.cwd(), 'public', 'images');
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isValidFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return SUPPORTED_FORMATS.includes(ext);
}

function generateFilename(originalName: string, type: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const uuid = crypto.randomUUID().slice(0, 8);
  return `${type}-${timestamp}-${uuid}.${ext}`;
}

async function downloadRemoteImage(url: string): Promise<Buffer> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_FILE_SIZE) {
        throw new Error(`Image too large: ${buffer.byteLength} bytes (max ${MAX_FILE_SIZE})`);
      }

      return Buffer.from(buffer);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    throw new Error(`Failed to download image from URL: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const campaignId = searchParams.get('campaignId');

    // Validate query parameters
    const queryValidation = listQuerySchema.safeParse({
      type: type || undefined,
      campaignId: campaignId || undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', issues: queryValidation.error.issues },
        { status: 400 }
      );
    }

    const storagePath = await getStoragePath();

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(storagePath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
    }

    // List files in storage directory
    const files = await fs.readdir(storagePath);
    const imageFiles = files.filter((f) => isValidFormat(f));

    // Parse metadata from filenames
    const images = imageFiles
      .map((filename) => {
        const parts = filename.split('-');
        if (parts.length < 3) return null;

        const fileType = parts[0];
        const timestamp = parseInt(parts[1]);
        const ext = getFileExtension(filename);

        return {
          id: filename,
          type: fileType,
          filename,
          url: `/api/images/${filename}`,
          uploadedAt: new Date(timestamp),
        };
      })
      .filter((img) => img !== null);

    // Apply filters
    let filtered = images;
    if (queryValidation.data.type) {
      filtered = filtered.filter((img) => img?.type === queryValidation.data.type);
    }

    // Note: campaignId is parsed from filename if stored with context,
    // but currently we store only type in filename
    // For future enhancement, could store metadata in a JSON file or database

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error('Error listing images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list images' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let type: string;
    let buffer: Buffer | null = null;
    let filename: string | null = null;

    // Check if it's multipart form data or JSON
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      type = (formData.get('type') as string) || 'scene';

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate form data
      const formValidation = uploadFormSchema.safeParse({ type });
      if (!formValidation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid form data', issues: formValidation.error.issues },
          { status: 400 }
        );
      }

      // Check file format
      if (!isValidFormat(file.name)) {
        return NextResponse.json(
          { success: false, error: `Invalid file format. Supported: ${SUPPORTED_FORMATS.join(', ')}` },
          { status: 400 }
        );
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      buffer = Buffer.from(await file.arrayBuffer());
      filename = generateFilename(file.name, type);
    } else if (contentType.includes('application/json')) {
      // Handle JSON body with remote URL download
      const body = await request.json();
      const urlValidation = downloadUrlSchema.safeParse(body);

      if (!urlValidation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', issues: urlValidation.error.issues },
          { status: 400 }
        );
      }

      const { url, type: imageType, campaignId } = urlValidation.data;

      // Download image from URL
      buffer = await downloadRemoteImage(url);

      // Determine filename from URL or use generic
      const urlPath = new URL(url).pathname;
      const urlFilename = urlPath.split('/').pop() || 'image';
      filename = generateFilename(urlFilename, imageType);

      type = imageType;
    } else {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    // Save file to storage
    const storagePath = await getStoragePath();

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(storagePath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
    }

    const filePath = path.join(storagePath, filename);
    await fs.writeFile(filePath, buffer);

    const servedUrl = `/api/images/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        id: filename,
        filename,
        type,
        url: servedUrl,
        uploadedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    const errorMessage = error?.message || 'Failed to upload image';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
