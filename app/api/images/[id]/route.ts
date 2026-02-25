import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as settingsService from '../../../../lib/services/settings-service';

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

function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  return path.basename(filename);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filename = sanitizeFilename(id);

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const storagePath = await getStoragePath();
    const filePath = path.join(storagePath, filename);

    // Security: ensure the resolved path is within the storage directory
    const resolvedPath = path.resolve(filePath);
    const resolvedStoragePath = path.resolve(storagePath);
    if (!resolvedPath.startsWith(resolvedStoragePath)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    switch (ext) {
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filename = sanitizeFilename(id);

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const storagePath = await getStoragePath();
    const filePath = path.join(storagePath, filename);

    // Security: ensure the resolved path is within the storage directory
    const resolvedPath = path.resolve(filePath);
    const resolvedStoragePath = path.resolve(storagePath);
    if (!resolvedPath.startsWith(resolvedStoragePath)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete file
    await fs.unlink(filePath);

    return NextResponse.json({
      success: true,
      data: { message: 'File deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
