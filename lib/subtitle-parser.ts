import type { TranscriptSegment } from './types';

/**
 * Parse SRT subtitle format
 * Format:
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * Subtitle text
 */
export function parseSRT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // Line 0: sequence number (skip)
    // Line 1: timestamp
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    
    if (!timeMatch) continue;

    const startHours = parseInt(timeMatch[1], 10);
    const startMinutes = parseInt(timeMatch[2], 10);
    const startSeconds = parseInt(timeMatch[3], 10);
    const startMillis = parseInt(timeMatch[4], 10);

    const endHours = parseInt(timeMatch[5], 10);
    const endMinutes = parseInt(timeMatch[6], 10);
    const endSeconds = parseInt(timeMatch[7], 10);
    const endMillis = parseInt(timeMatch[8], 10);

    const start = startHours * 3600 + startMinutes * 60 + startSeconds + startMillis / 1000;
    const end = endHours * 3600 + endMinutes * 60 + endSeconds + endMillis / 1000;
    const duration = end - start;

    // Lines 2+: text content
    const text = lines.slice(2).join(' ').trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Parse WebVTT subtitle format
 * Format:
 * WEBVTT
 * 
 * 00:00:00.000 --> 00:00:05.000
 * Subtitle text
 */
export function parseVTT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Remove WEBVTT header
  let normalized = content.replace(/^WEBVTT[^\n]*\n/, '');
  
  // Remove cue identifiers (optional lines before timestamps)
  normalized = normalized.replace(/\n[^\n]*\n(\d{2}:\d{2}:\d{2}\.\d{3})/g, '\n$1');
  
  const blocks = normalized.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // First line should be timestamp
    const timeLine = lines[0];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    
    if (!timeMatch) continue;

    const startHours = parseInt(timeMatch[1], 10);
    const startMinutes = parseInt(timeMatch[2], 10);
    const startSeconds = parseInt(timeMatch[3], 10);
    const startMillis = parseInt(timeMatch[4], 10);

    const endHours = parseInt(timeMatch[5], 10);
    const endMinutes = parseInt(timeMatch[6], 10);
    const endSeconds = parseInt(timeMatch[7], 10);
    const endMillis = parseInt(timeMatch[8], 10);

    const start = startHours * 3600 + startMinutes * 60 + startSeconds + startMillis / 1000;
    const end = endHours * 3600 + endMinutes * 60 + endSeconds + endMillis / 1000;
    const duration = end - start;

    // Remaining lines: text content
    const text = lines.slice(1)
      .map(line => line.replace(/<[^>]*>/g, '')) // Remove VTT tags
      .join(' ')
      .trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Auto-detect subtitle format and parse
 */
export function parseSubtitle(content: string, filename?: string): TranscriptSegment[] {
  // Detect format from content or filename
  const isVTT = content.startsWith('WEBVTT') || filename?.toLowerCase().endsWith('.vtt');
  
  if (isVTT) {
    return parseVTT(content);
  } else {
    return parseSRT(content);
  }
}

/**
 * Validate subtitle file format
 */
export function isValidSubtitleFormat(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'srt' || ext === 'vtt';
}
