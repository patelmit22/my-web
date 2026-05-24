import type { AtlasMedia } from '../types/models';

const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

export interface MediaPick {
  type: AtlasMedia['type'];
  file: File;
  prev: string;
  name: string;
}

export function fileToPick(file: File): MediaPick {
  return {
    type: file.type.startsWith('video') ? 'video' : 'image',
    file,
    prev: URL.createObjectURL(file),
    name: file.name
  };
}

export function releasePicks(picks: MediaPick[]): void {
  picks.forEach(pick => URL.revokeObjectURL(pick.prev));
}

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 1200;
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) {
          height = Math.round((height * max) / width);
          width = max;
        } else {
          width = Math.round((width * max) / height);
          height = max;
        }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function videoToData(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = Math.round((file.size / 1024 / 1024) * 10) / 10;
    throw new Error(`Video "${file.name}" is ${mb} MB. Keep videos under 8 MB so Firebase storage stays healthy.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(String(event.target?.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function serializeMedia(picks: MediaPick[], onProgress: (label: string) => void): Promise<AtlasMedia[]> {
  const media: AtlasMedia[] = [];
  for (let i = 0; i < picks.length; i += 1) {
    onProgress(`processing ${i + 1}/${picks.length}...`);
    const pick = picks[i];
    const data = pick.type === 'image' ? await compressImage(pick.file) : await videoToData(pick.file);
    media.push({ type: pick.type, data, name: pick.name });
  }
  return media;
}
