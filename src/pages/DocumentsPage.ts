import type { AppState } from '../state/appState';
import { hasDriveClient } from '../api/driveApi';
import { fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

function fileSize(size?: string): string {
  const bytes = Number(size || 0);
  if (!bytes) return 'Drive file';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function docIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'IMG';
  if (mimeType.includes('video')) return 'VID';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
  return 'DOC';
}

export function renderDocumentsPage(state: AppState): string {
  const hasClient = hasDriveClient();
  const ownerLabel = state.driveOwner === 'her' ? 'Shrushti' : 'Mit';
  const selected = state.docFiles.length
    ? `<div class="doc-selected">${state.docFiles.map(file => `<span>${esc(file.name)}</span>`).join('')}</div>`
    : '<div class="doc-selected muted">no files selected</div>';
  const docs = state.driveDocs.length
    ? state.driveDocs.map(doc => `<article class="doc-card">
        <div class="doc-icon">${docIcon(doc.mimeType)}</div>
        <div class="doc-copy">
          <div class="doc-name">${esc(doc.name)}</div>
          <div class="doc-meta">${fileSize(doc.size)}${doc.createdTime ? ` · ${fmtDate(doc.createdTime)}` : ''}</div>
        </div>
        <div class="doc-card-actions">
          <a class="doc-open" href="${esc(doc.webViewLink || doc.webContentLink || '#')}" target="_blank" rel="noreferrer">open</a>
          <button class="doc-delete" data-action="delete-drive-doc" data-id="${esc(doc.id)}">delete</button>
        </div>
      </article>`).join('')
    : `<div class="empty-inline">no ${ownerLabel} documents loaded yet</div>`;

  return `<section class="page active" id="page-documents">
    <div class="page-header">
      <div>
        <div class="page-title">Documents</div>
        <div class="page-sub">upload files to your Google Drive and open them from this website.</div>
      </div>
    </div>
    ${hasClient ? '' : `<div class="drive-setup">
      <div class="section-title">Google Drive setup needed</div>
      <p>Add your Google OAuth Client ID in Netlify as <code>VITE_GOOGLE_CLIENT_ID</code>, then redeploy. After that this tab can upload directly to your Drive.</p>
    </div>`}
    <div class="drive-panel">
      <div class="drive-panel-head">
        <div>
          <div class="section-title">Drive locker</div>
          <div class="finance-section-sub">Files save in separate Drive folders for Mit and Shrushti.</div>
        </div>
        <div class="finance-section-actions">
          <button class="finance-action compact" data-action="connect-drive" ${!hasClient || state.driveBusy ? 'disabled' : ''}>${state.driveConnected ? 'Drive connected' : 'connect Google Drive'}</button>
          <button class="finance-action compact" data-action="refresh-drive-docs" ${!hasClient || state.driveBusy ? 'disabled' : ''}>refresh</button>
        </div>
      </div>
      <div class="doc-owner-tabs">
        <button class="doc-owner-tab ${state.driveOwner === 'me' ? 'active' : ''}" data-action="select-doc-owner" data-owner="me">Mit documents</button>
        <button class="doc-owner-tab ${state.driveOwner === 'her' ? 'active' : ''}" data-action="select-doc-owner" data-owner="her">Shrushti documents</button>
      </div>
      <div class="doc-upload-row">
        <button class="doc-drop" data-action="choose-doc-files" ${!hasClient || state.driveBusy ? 'disabled' : ''}>
          <span>+</span>
          choose ${ownerLabel} documents
        </button>
        <div class="doc-upload-copy">
          ${selected}
          <button class="btn-primary doc-upload-btn" data-action="upload-docs" ${!hasClient || state.driveBusy || !state.docFiles.length ? 'disabled' : ''}>${state.driveBusy ? 'working...' : `upload to ${ownerLabel}'s Drive folder`}</button>
        </div>
      </div>
      <input id="doc-files" type="file" multiple hidden>
      ${state.driveStatus ? `<div class="drive-status">${esc(state.driveStatus)}</div>` : ''}
    </div>
    <div class="doc-grid">${docs}</div>
  </section>`;
}
