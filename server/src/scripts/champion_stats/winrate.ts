import type { ChampionStatsAccumulator } from './types'

export function updateWinrate(stats: ChampionStatsAccumulator, win: boolean): void {
  stats.matches += 1
  if (win) {
    stats.wins += 1
  }
}

export function createWinRate(stats: ChampionStatsAccumulator): string {
  return ((stats.wins / stats.matches) * 100).toFixed(2)
}
