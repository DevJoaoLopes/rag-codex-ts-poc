export function l2Normalize(vec: number[]): number[] {
  if (vec.length === 0) {
    return [];
  }

  let sumSquares = 0;
  for (const value of vec) {
    sumSquares += value * value;
  }

  if (sumSquares === 0) {
    return vec.map(() => 0);
  }

  const norm = Math.sqrt(sumSquares);
  return vec.map((value) => value / norm);
}

export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result += a[i] * b[i];
  }

  return result;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  return dot(l2Normalize(a), l2Normalize(b));
}
