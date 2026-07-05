import type { FunOwner } from '../types/models';
import { storage } from './firebaseClient';

export interface UploadedMedia {
  url: string;
  storagePath: string;
}

export async function uploadFunMedia(file: File, owner: FunOwner, packId: string, index: number): Promise<UploadedMedia> {
  const storagePath = `fun-vault/${owner}/${packId}/${index + 1}-${safeStorageName(file.name)}`;
  const ref = storage.ref(storagePath);
  await ref.put(file, {
    contentType: file.type || undefined,
    customMetadata: {
      originalName: file.name,
      owner
    }
  });
  const url = await ref.getDownloadURL();
  return { url, storagePath };
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await storage.ref(storagePath).delete();
}

function safeStorageName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return clean || 'fun-media';
}
