'use client';

import type { ImageLoaderProps } from 'next/image';
import { cloudinaryUrl } from '@/lib/cloudinary-url';

export default function cloudinaryLoader(props: ImageLoaderProps): string {
  return cloudinaryUrl(props);
}
