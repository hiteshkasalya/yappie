export function createPairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}
