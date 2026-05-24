export function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function greetingTime(): { label: string; timestamp: string } {
  const hour = new Date().getHours();
  const label = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  return { label, timestamp };
}
