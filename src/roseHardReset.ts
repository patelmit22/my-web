function getRoseAction(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) return '';

  const node = target.closest<HTMLElement>(
    '[data-rose-action], [data-action], .rose-fab, .rose-greeting-toast',
  );

  if (!node) return '';
  if (node.classList.contains('rose-fab') || node.classList.contains('rose-greeting-toast')) {
    return 'open';
  }

  return node.dataset.roseAction || node.dataset.action || '';
}

function setRoseOpen(open: boolean): void {
  const widget = document.querySelector<HTMLElement>('.rose-widget');
  const panel = document.querySelector<HTMLElement>('.rose-panel');

  widget?.classList.toggle('open', open);
  panel?.classList.toggle('open', open);

  if (widget) {
    widget.style.zIndex = '9999';
    widget.style.pointerEvents = 'auto';
  }

  if (panel) {
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    panel.style.pointerEvents = open ? 'auto' : '';
  }

  if (open) {
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('#rose-input')?.focus();
    });
  }
}

function handleRoseClick(event: MouseEvent): void {
  const action = getRoseAction(event.target);

  if (action === 'open' || action === 'toggle-rose') {
    event.preventDefault();
    event.stopImmediatePropagation();
    setRoseOpen(true);
    return;
  }

  if (action === 'close' || action === 'close-rose') {
    event.preventDefault();
    event.stopImmediatePropagation();
    setRoseOpen(false);
  }
}

function handleRoseKey(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const action = getRoseAction(event.target);
  if (action !== 'open' && action !== 'toggle-rose' && action !== 'close' && action !== 'close-rose') {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  setRoseOpen(action === 'open' || action === 'toggle-rose');
}

document.addEventListener('click', handleRoseClick, true);
document.addEventListener('keydown', handleRoseKey, true);
