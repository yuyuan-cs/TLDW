import { NextRequest, NextResponse } from 'next/server';
import { parseSubtitle, isValidSubtitleFormat } from '@/lib/subtitle-parser';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

async function handler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const subtitleFile = formData.get('subtitle') as File;
    const videoId = formData.get('videoId') as string;

    if (!subtitleFile) {
      return NextResponse.json(
        { error: 'Subtitle file is required' },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Validate file format
    if (!isValidSubtitleFormat(subtitleFile.name)) {
      return NextResponse.json(
        { error: 'Invalid subtitle format. Supported: SRT, VTT' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await subtitleFile.text();

    // Parse subtitle file
    const transcript = parseSubtitle(content, subtitleFile.name);

    if (transcript.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse subtitle file or file is empty' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      videoId,
      transcript,
      segmentCount: transcript.length
    });
  } catch (error) {
    console.error('Upload subtitle error:', error);
    return NextResponse.json(
      { error: 'Failed to process subtitle file' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, SECURITY_PRESETS.PUBLIC);
