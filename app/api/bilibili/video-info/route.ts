import { NextRequest, NextResponse } from 'next/server';
import { extractBilibiliId } from '@/lib/utils';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

async function handler(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Bilibili URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractBilibiliId(url);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid Bilibili URL' },
        { status: 400 }
      );
    }

    // Fetch video info from Bilibili API
    // Note: Bilibili API requires parsing BV/AV ID
    let bvid = videoId;
    let aid = null;

    if (videoId.startsWith('av')) {
      aid = videoId.substring(2);
    } else if (videoId.startsWith('BV')) {
      bvid = videoId;
    }

    const apiUrl = bvid.startsWith('BV')
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Bilibili video info');
    }

    const data = await response.json();

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch video info' },
        { status: 400 }
      );
    }

    const videoData = data.data;

    return NextResponse.json({
      videoId: videoData.bvid || `av${videoData.aid}`,
      title: videoData.title,
      author: videoData.owner?.name || 'Unknown',
      thumbnail: videoData.pic,
      duration: videoData.duration,
      description: videoData.desc,
      tags: videoData.tag?.map((t: any) => t.tag_name) || [],
      source: 'bilibili'
    });
  } catch (error) {
    console.error('Bilibili video info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bilibili video info' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, SECURITY_PRESETS.PUBLIC);
