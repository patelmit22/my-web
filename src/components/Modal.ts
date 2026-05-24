export function openModal(id: string): void {
  document.getElementById(id)?.classList.add('open');
}

export function closeModal(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}
