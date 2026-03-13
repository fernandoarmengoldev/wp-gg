import type { NumberMap } from '../../types'

export type RankedEntry = {
  name: string
  value: number
}

export type ChampionStatsAccumulator = {
  boots: NumberMap
  goodAgainst: NumberMap
  items: NumberMap
  matches: number
  runes: NumberMap
  spells: NumberMap
  totalEachChamp: NumberMap
  wins: number
}

export function createChampionStatsAccumulator(): ChampionStatsAccumulator {
  return {
    boots: {},
    goodAgainst: {},
    items: {},
    matches: 0,
    runes: {},
    spells: {},
    totalEachChamp: {},
    wins: 0,
  }
}
