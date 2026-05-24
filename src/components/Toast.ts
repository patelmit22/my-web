export class Toast {
  private timer: number | undefined;

  constructor(private readonly rootId = 'toast') {}

  show(message: string, kind: 'ok' | 'err' | '' = ''): void {
    const toast = document.getElementById(this.rootId);
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${kind}`;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      toast.className = 'toast';
    }, 2400);
  }
}
