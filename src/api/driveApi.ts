import type { DriveDoc } from '../types/models';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '545205180619-tp29t0necatad5mc8l2fcg1cqfpfs9d1.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'mitpatel.family documents';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
  callback?: (response: TokenResponse) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let accessToken = '';
let tokenClient: TokenClient | null = null;
let folderId = '';

export function hasDriveClient(): boolean {
  return Boolean(CLIENT_ID);
}

export function isDriveConnected(): boolean {
  return Boolean(accessToken);
}

export async function connectDrive(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Missing VITE_GOOGLE_CLIENT_ID in Netlify environment variables.');
  if (!window.google?.accounts?.oauth2) await loadGoogleIdentity();
  tokenClient ||= window.google!.accounts!.oauth2!.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: () => undefined
  });

  const response = await new Promise<TokenResponse>((resolve, reject) => {
    tokenClient!.callback = result => {
      if (result.error) reject(new Error(result.error_description || result.error));
      else resolve(result);
    };
    tokenClient!.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
  if (!response.access_token) throw new Error('Google did not return an access token.');
  accessToken = response.access_token;
  folderId = await ensureFolder();
}

export async function listDriveDocs(): Promise<DriveDoc[]> {
  await requireDrive();
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,webContentLink,size,createdTime)');
  const data = await driveFetch<{ files: DriveDoc[] }>(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime desc&pageSize=100`);
  return data.files || [];
}

export async function uploadDriveDoc(file: File): Promise<DriveDoc> {
  await requireDrive();
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [folderId]
  };
  const boundary = `mitpatel_family_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const close = `\r\n--${boundary}--`;
  const body = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    file,
    close
  ]);

  return driveFetch<DriveDoc>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size,createdTime', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
}

async function requireDrive(): Promise<void> {
  if (!accessToken) await connectDrive();
  if (!folderId) folderId = await ensureFolder();
}

async function ensureFolder(): Promise<string> {
  const query = encodeURIComponent(`name='${FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const fields = encodeURIComponent('files(id,name)');
  const found = await driveFetch<{ files: Array<{ id: string; name: string }> }>(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1`);
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = await driveFetch<{ id: string }>('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  return created.id;
}

async function driveFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(url, {
    ...init,
    headers
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Google Drive request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in script failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in script failed to load.'));
    document.head.appendChild(script);
  });
}
