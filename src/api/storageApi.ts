import type { FunOwner } from '../types/models';
import { storage } from './firebaseClient';

export interface UploadedMedia {
  storagePath?: string;
}

export async function uploadFunMedia(
  file: File,
  owner: FunOwner,
  packId: string,
  index: number,
  onProgress?: (percent: number) => void
): Promise<UploadedMedia> {
  const storagePath = `fun-vault/${owner}/${packId}/${index + 1}-${safeStorageName(file.name)}`;
  const ref = storage.ref(storagePath);
  const task = ref.put(file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: { originalName: file.name, owner }
  });

  await new Promise<void>((resolve, reject) => {
    let hasStarted = false;
    let settled = false;
    const clearTimers = () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(timeout);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      try {
        task.cancel();
      } catch {
        // Already finished or cancelled.
      }
      reject(error);
    };
    const startTimeout = window.setTimeout(() => {
      if (!hasStarted) {
        fail(new Error('Storage upload did not start. Falling back to private database save.'));
      }
    }, 15000);
    const timeout = window.setTimeout(() => {
      fail(new Error('Upload timed out. Try a smaller video or a stronger Wi-Fi connection.'));
    }, 10 * 60 * 1000);

    task.on(
      'state_changed',
      snap => {
        if (snap.bytesTransferred > 0) {
          hasStarted = true;
        }
        if (snap.totalBytes > 0) {
          onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      error => {
        fail(error);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimers();
        onProgress?.(100);
        resolve();
      }
    );
  });

  return { storagePath };
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await storage.ref(storagePath).delete();
}

export async function getStorageFileUrl(storagePath: string): Promise<string> {
  return storage.ref(storagePath).getDownloadURL();
}

function safeStorageName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return clean || 'fun-media';
}
