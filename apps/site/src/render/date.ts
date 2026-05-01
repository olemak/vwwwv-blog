// Date formatters. Input is unix-epoch seconds (the way we store timestamps
// in D1).

export function formatDateLong(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const month = d.toLocaleString('en', { month: 'long' }).toUpperCase();
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateShort(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

/** "Vol. 04 · Edition CXVII · Thursday, 30 April 2026 · Bern" */
export function formatEditionLine(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const day = d.toLocaleString('en', { weekday: 'long' });
  const date = d.getDate();
  const month = d.toLocaleString('en', { month: 'long' });
  const year = d.getFullYear();
  return `${day}, ${date} ${month} ${year} · vwwwv.org`;
}
