import type { ImageLoaderProps } from 'next/image';

export function cloudinaryUrl({ src, width, quality }: ImageLoaderProps): string {
  const UPLOAD_MARKER = '/image/upload/';
  const markerIndex = src.indexOf(UPLOAD_MARKER);

  if (markerIndex === -1) return src;

  const transformations = ['f_auto', 'q_' + (quality ?? 'auto'), 'c_limit', `w_${width}`].join(',');
  const prefix = src.slice(0, markerIndex + UPLOAD_MARKER.length);
  const suffix = src.slice(markerIndex + UPLOAD_MARKER.length);

  return `${prefix}${transformations}/${suffix}`;
}
