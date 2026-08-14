import { ApiError, apiClient } from '@/lib/api/client';
import { formatAdminError } from '@/lib/admin/errors';

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const UPLOAD_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOAD_ACCEPT_ATTR = UPLOAD_ACCEPT.join(',');

export type UploadFolder = 'products' | 'collections';

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateImageFile(file: File): string | null {
  if (!(UPLOAD_ACCEPT as readonly string[]).includes(file.type)) {
    return `Formato não aceito. Use JPEG, PNG ou WebP.`;
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return `Arquivo de ${formatBytes(file.size)} — o limite é ${formatBytes(UPLOAD_MAX_BYTES)}.`;
  }
  return null;
}

interface UploadResponse {
  urls: string[];
}

export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const form = new FormData();
  form.append('files', file);
  form.append('folder', folder);

  try {
    const response = await apiClient.post<UploadResponse>('/v1/admin/uploads', form, {
      timeout: 120_000,
    });
    const url = response.data?.urls?.[0];
    if (!url) {
      throw new Error('O servidor aceitou o envio mas não devolveu a URL da imagem.');
    }
    return url;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    throw new Error(formatAdminError(error, 'Não foi possível enviar a imagem.'));
  }
}
