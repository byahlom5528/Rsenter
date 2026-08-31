/**
 * Media and URL utility functions for handling video embeds, external links, and validations.
 */

export interface MediaEmbedInfo {
  type: 'youtube' | 'direct_video' | 'external_doc' | 'empty';
  embedUrl: string | null;
  rawUrl: string;
}

/**
 * Parses any video/document URL and returns normalized embed info.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Direct video files (.mp4, .webm, .ogg)
 * - Standard web links / docs
 */
export function getMediaInfo(url?: string | null): MediaEmbedInfo {
  if (!url || !url.trim()) {
    return { type: 'empty', embedUrl: null, rawUrl: '' };
  }

  const rawUrl = url.trim();

  // 1. YouTube Matchers
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const ytMatch = rawUrl.match(youtubeRegex);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
      rawUrl,
    };
  }

  // 2. Direct HTML5 Video File Matcher
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(rawUrl);
  if (isDirectVideo) {
    return {
      type: 'direct_video',
      embedUrl: ensureValidUrl(rawUrl),
      rawUrl,
    };
  }

  // 3. Fallback: External Document / Web link
  return {
    type: 'external_doc',
    embedUrl: null,
    rawUrl: ensureValidUrl(rawUrl),
  };
}

/**
 * Ensures an external URL starts with http:// or https://.
 * Prevents relative route navigation bugs when opening external links.
 */
export function ensureValidUrl(url?: string | null): string {
  if (!url || !url.trim()) return '#';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
