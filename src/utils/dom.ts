import morphdom from 'morphdom';

export function qs<T extends Element = Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

export function formValue(root: ParentNode, selector: string): string {
  return qs<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector, root).value.trim();
}

export function checked(root: ParentNode, selector: string): boolean {
  return qs<HTMLInputElement>(selector, root).checked;
}

function preserveLiveField(fromEl: Element, toEl: Element): void {
  if (!(fromEl instanceof HTMLInputElement || fromEl instanceof HTMLTextAreaElement || fromEl instanceof HTMLSelectElement)) return;
  if (!(toEl instanceof HTMLInputElement || toEl instanceof HTMLTextAreaElement || toEl instanceof HTMLSelectElement)) return;
  if (document.activeElement !== fromEl) return;
  toEl.value = fromEl.value;
  if (fromEl instanceof HTMLInputElement && toEl instanceof HTMLInputElement) {
    toEl.checked = fromEl.checked;
  }
}

export function morphHtml(target: HTMLElement, html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  if (!template.content.children.length) {
    target.innerHTML = '';
    return;
  }

  const singleChild = template.content.children.length === 1 ? template.content.firstElementChild : null;
  const next = singleChild?.tagName === target.tagName
    ? singleChild as HTMLElement
    : (() => {
        const wrapper = target.cloneNode(false) as HTMLElement;
        wrapper.innerHTML = html;
        return wrapper;
      })();

  morphdom(target, next, {
    onBeforeElUpdated: (fromEl, toEl) => {
      if (fromEl instanceof HTMLElement && (fromEl.hasAttribute('data-morph-skip') || fromEl.dataset.morphSkip === 'true')) return false;
      preserveLiveField(fromEl, toEl);
      return true;
    }
  });
}

export function morphNode(selector: string, html: string, root: ParentNode = document): void {
  const target = root.querySelector<HTMLElement>(selector);
  if (!target) return;
  morphHtml(target, html);
}
