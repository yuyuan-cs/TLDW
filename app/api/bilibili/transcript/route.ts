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

    // Parse video ID
    let bvid = videoId;
    let aid = null;

    if (videoId.startsWith('av')) {
      aid = videoId.substring(2);
    } else if (videoId.startsWith('BV')) {
      bvid = videoId;
    }

    // First, get video info to obtain cid
    const infoUrl = bvid.startsWith('BV')
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;

    const infoResponse = await fetch(infoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });

    if (!infoResponse.ok) {
      throw new Error('Failed to fetch Bilibili video info');
    }

    const infoData = await infoResponse.json();

    if (infoData.code !== 0) {
      return NextResponse.json(
        { error: infoData.message || 'Failed to fetch video info' },
        { status: 400 }
      );
    }

    const cid = infoData.data.cid;
    const actualBvid = infoData.data.bvid;

    // Fetch subtitle list
    const subtitleUrl = `https://api.bilibili.com/x/player/v2?bvid=${actualBvid}&cid=${cid}`;
    
    const subtitleResponse = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });

    if (!subtitleResponse.ok) {
      throw new Error('Failed to fetch subtitle list');
    }

    const subtitleData = await subtitleResponse.json();

    if (subtitleData.code !== 0) {
      return NextResponse.json(
        { error: 'No subtitles available for this video' },
        { status: 404 }
      );
    }

    const subtitles = subtitleData.data?.subtitle?.subtitles || [];

    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: 'No subtitles available for this video' },
        { status: 404 }
      );
    }

    // Prefer Chinese subtitles, fallback to first available
    let selectedSubtitle = subtitles.find((s: any) => 
      s.lan === 'zh-CN' || s.lan === 'zh-Hans' || s.lan === 'zh-Hant'
    );

    if (!selectedSubtitle) {
      selectedSubtitle = subtitles[0];
    }

    // Fetch subtitle content
    const subtitleContentUrl = selectedSubtitle.subtitle_url.startsWith('http')
      ? selectedSubtitle.subtitle_url
      : `https:${selectedSubtitle.subtitle_url}`;

    const contentResponse = await fetch(subtitleContentUrl);

    if (!contentResponse.ok) {
      throw new Error('Failed to fetch subtitle content');
    }

    const contentData = await contentResponse.json();

    // Convert Bilibili subtitle format to TranscriptSegment format
    const transcript = contentData.body.map((item: any) => ({
      text: item.content,
      start: item.from,
      duration: item.to - item.from
    }));

    return NextResponse.json({
      videoId: actualBvid,
      transcript,
      language: selectedSubtitle.lan
    });
  } catch (error) {
    console.error('Bilibili transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bilibili transcript' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, SECURITY_PRESETS.PUBLIC);
