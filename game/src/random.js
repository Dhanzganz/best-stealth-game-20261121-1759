// The Lantern Thief — tiny seeded random number generator. Every run that
// starts from the same seed draws the same numbers, so a screenshot taken
// from a fixed seed is the same picture every time.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element from an array with a seeded draw.
export function pick(rand, items) {
  return items[Math.floor(rand() * items.length)];
}
