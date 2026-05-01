// Minimal HTML escaping. Used everywhere user/db content lands in markup.

const ESCAPE_HTML: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_HTML[c] ?? c);
}

export function escapeAttr(s: string): string {
  return escapeHtml(s);
}
