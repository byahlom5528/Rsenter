/**
 * Media and URL utility functions for handling video embeds, external links, and validations.
 */

export interface MediaEmbedInfo {
  type: 'youtube' | 'google_drive' | 'loom' | 'direct_video' | 'external_doc' | 'empty';
  embedUrl: string | null;
  rawUrl: string;
}

/**
 * Parses any video/document URL and returns normalized embed info.
 * Supports:
 * - YouTube (watch, youtu.be, shorts, embed)
 * - Google Drive (preview)
 * - Loom
 * - Direct video files (.mp4, .webm, .ogg)
 * - Standard web links / docs
 */
export function getMediaInfo(url?: string | null): MediaEmbedInfo {
  if (!url || !url.trim()) {
    return { type: 'empty', embedUrl: null, rawUrl: '' };
  }

  const rawUrl = url.trim();

  // 1. YouTube Matchers
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

  // 2. Google Drive & Google Docs Matchers (convert view/share/edit to preview)
  const gDriveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
                      rawUrl.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    return {
      type: 'google_drive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      rawUrl,
    };
  }

  const gDocsMatch = rawUrl.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i);
  if (gDocsMatch && gDocsMatch[1] && gDocsMatch[2]) {
    const docType = gDocsMatch[1];
    const docId = gDocsMatch[2];
    return {
      type: 'google_drive',
      embedUrl: `https://docs.google.com/${docType}/d/${docId}/preview`,
      rawUrl,
    };
  }

  // 3. Loom Video Matcher
  const loomMatch = rawUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    const loomId = loomMatch[1];
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomId}`,
      rawUrl,
    };
  }

  // 4. Direct HTML5 Video File Matcher
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(rawUrl);
  if (isDirectVideo) {
    return {
      type: 'direct_video',
      embedUrl: ensureValidUrl(rawUrl),
      rawUrl,
    };
  }

  // 5. Fallback: External Document / Web link
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
