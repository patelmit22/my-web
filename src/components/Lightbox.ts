import type { AtlasEntry } from '../types/models';

export class Lightbox {
  private urls: string[] = [];
  private index = 0;

  open(entry: AtlasEntry, index: number): void {
    this.urls = (entry.media || []).filter(media => media.type === 'image').map(media => media.data);
    this.index = index;
    this.show();
    document.getElementById('lb')?.classList.add('open');
  }

  close(event?: Event): void {
    if (!event || event.target === document.getElementById('lb')) {
      document.getElementById('lb')?.classList.remove('open');
    }
  }

  nav(delta: number): void {
    if (!this.urls.length) return;
    this.index = (this.index + delta + this.urls.length) % this.urls.length;
    this.show();
  }

  private show(): void {
    const img = document.getElementById('lb-img') as HTMLImageElement | null;
    if (img) img.src = this.urls[this.index] || '';
  }
}
