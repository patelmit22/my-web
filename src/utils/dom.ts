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
