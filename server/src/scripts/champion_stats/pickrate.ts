import type { ChampionStatsAccumulator } from './types'

export function createPickRate(stats: ChampionStatsAccumulator, totalMatchCount: number): string {
  return ((stats.matches / totalMatchCount) * 100).toFixed(2)
}
