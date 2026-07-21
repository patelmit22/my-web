export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 100): T {
  let timer: ReturnType<typeof window.setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  }) as T;
}
