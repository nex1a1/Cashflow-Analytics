/**
 * "Latest request wins": `const begin = latestOnly()`, then `const isCurrent = begin()` before each fetch and
 * `if (!isCurrent()) return` after it. A slow earlier response can then no longer overwrite a newer one.
 */
export function latestOnly() {
  let latest = 0;
  return () => {
    const mine = ++latest;
    return () => mine === latest;
  };
}
