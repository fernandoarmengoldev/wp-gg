import type { ChampionStatsAccumulator } from './types'

import { createPercentageEntries, getTopEntries, incrementMap } from './shared'

function createSpellPairKey(spells: number[]): string {
  return [...spells].sort((left, right) => left - right).join('+')
}

export function updateSpells(stats: ChampionStatsAccumulator, spells: number[]): void {
  incrementMap(stats.spells, createSpellPairKey(spells))
}

export function createSpells(stats: ChampionStatsAccumulator): Pick<import('../../types').ChampionStatsResponse, 'spells'> {
  return {
    spells: createPercentageEntries(getTopEntries(2, stats.spells), stats.matches),
  }
}
