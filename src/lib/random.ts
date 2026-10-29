/** Kept apart from brush.ts, which touches the DOM when loaded, so the landscape worker can use it too. */
export function seededRandom(seed: number) {
  let state = (Math.abs(Math.floor(seed)) * 9973 + 12345) % 2147483647 || 1;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}
