'use server';

import { updateTag } from 'next/cache';

export async function revalidateCollections(): Promise<void> {
  updateTag('collections');
}

export async function revalidateProducts(): Promise<void> {
  updateTag('products');
}
