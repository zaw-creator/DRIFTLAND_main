/**
 * Dynamically generates a standard Olympic/Motorsport seeding map.
 * @param {number} n - The total number of spots in the bracket (must be a power of 2: 4, 8, 16, 32, 64)
 * @returns {Array<Array<number>>} - e.g., [[1, 16], [8, 9], ...]
 */
export function generateSeedingMap(n) {
  // Base case: The Finals
  let matches = [1, 2];

  // Calculate how many times we need to "fold" the bracket out
  const rounds = Math.log2(n);

  for (let r = 1; r < rounds; r++) {
    const currentRoundMatches = [];
    const sum = Math.pow(2, r + 1) + 1; // The "N + 1" magic rule

    for (let i = 0; i < matches.length; i++) {
      const seed = matches[i];
      // Replace the current seed with itself and its new opponent
      currentRoundMatches.push(seed);
      currentRoundMatches.push(sum - seed);
    }
    matches = currentRoundMatches;
  }

  // At this point, matches is a flat array: [1, 32, 16, 17, 8, 25...]
  // We chunk it into pairs for the battles: [[1, 32], [16, 17], [8, 25]...]
  const pairedMatches = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairedMatches.push([matches[i], matches[i + 1]]);
  }

  return pairedMatches;
}
