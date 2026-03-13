import type { ChampionStatsAccumulator } from './types'

import { getBottomEntries, getTopEntries, incrementMap } from './shared'

export function updateMatchups(stats: ChampionStatsAccumulator, enemyChampionId: number, win: boolean): void {
  if (win) {
    incrementMap(stats.goodAgainst, enemyChampionId)
  } else {
    incrementMap(stats.goodAgainst, enemyChampionId, -1)
  }

  incrementMap(stats.totalEachChamp, enemyChampionId)
}

export function createMatchups(stats: ChampionStatsAccumulator): Pick<import('../../types').ChampionStatsResponse, 'bestFive' | 'worstFive'> {
  const goodAgainst = { ...stats.goodAgainst }

  Object.keys(goodAgainst).forEach(key => {
    const total = stats.totalEachChamp[key]
    const against = goodAgainst[key]
    if (total === undefined || against === undefined) {
      return
    }

    const ratio = ((total + against) / (total * 2)) * 100
    if (ratio >= 70 || ratio <= 30) {
      delete goodAgainst[key]
    }
  })

  const bestFive = getTopEntries(4, goodAgainst)
  const worstFive = getBottomEntries(4, goodAgainst)
  const createMatchupValue = (name: string, value: number): string => (((stats.totalEachChamp[name] ?? 0) + value) / ((stats.totalEachChamp[name] ?? 1) * 2) * 100).toFixed(2)

  return {
    bestFive: bestFive.map(entry => ({ id: entry.name, value: createMatchupValue(entry.name, entry.value) })),
    worstFive: worstFive.map(entry => ({ id: entry.name, value: createMatchupValue(entry.name, entry.value) })),
  }
}
