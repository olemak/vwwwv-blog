// Reading-time computation. Behind the `reading-time` feature flag.
// Heuristic word count strips markdown punctuation so the estimate isn't
// inflated by syntax noise.

const WORDS_PER_MINUTE = 220;

export function wordCount(markdownBody: string): number {
  const cleaned = markdownBody
    .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
    .replace(/`[^`]*`/g, ' ')                   // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // link text
    .replace(/[#>*_~\-]+/g, ' ')                // syntax punctuation
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function readingTimeMinutes(markdownBody: string): number {
  const words = wordCount(markdownBody);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(markdownBody: string): string {
  const minutes = readingTimeMinutes(markdownBody);
  return `${minutes} min`;
}
