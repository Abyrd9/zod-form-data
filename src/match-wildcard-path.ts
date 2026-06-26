export const matchWildcardPath = (pattern: string, key: string) => {
  const patternParts = pattern.split(".");
  const keyParts = key.split(".");

  if (patternParts.length !== keyParts.length) return false;

  return patternParts.every((part, index) => {
    return part === "*" || part === keyParts[index];
  });
};
