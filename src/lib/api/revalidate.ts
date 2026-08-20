'use server';

import { revalidatePath, updateTag } from 'next/cache';

export async function revalidateCollections(): Promise<void> {
  updateTag('collections');
}

export async function revalidateProducts(): Promise<void> {
  updateTag('products');
}

export async function revalidateStorefrontPath(path: string): Promise<void> {
  if (/^\/(product|collections|catalog|sale)(\/|$)/.test(path)) {
    revalidatePath(path);
  }
}
