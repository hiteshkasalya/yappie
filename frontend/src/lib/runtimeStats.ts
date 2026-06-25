type RuntimeStats = {
  activeChats: number;
  onlineUserIds: Set<string>;
};

const globalForStats = globalThis as typeof globalThis & {
  yappieRuntimeStats?: RuntimeStats;
};

export const runtimeStats =
  globalForStats.yappieRuntimeStats ??
  (globalForStats.yappieRuntimeStats = {
    activeChats: 0,
    onlineUserIds: new Set<string>()
  });
