export function estimateTokens(text: string): number {
  if (!text.trim()) {
    return 0;
  }

  // Heuristica simples: em media, 1 token ~= 4 caracteres em texto natural.
  return Math.max(1, Math.ceil(text.length / 4));
}
