import type { MatchParticipant } from '../../types'

import type { ChampionStatsAccumulator } from './types'
import { buildRuneKey, createPercentageEntries, getTopEntries, incrementMap } from './shared'

export function updateRunes(stats: ChampionStatsAccumulator, participant: MatchParticipant): void {
  incrementMap(stats.runes, buildRuneKey(participant))
}

export function createRunes(stats: ChampionStatsAccumulator): Pick<import('../../types').ChampionStatsResponse, 'runes'> {
  return {
    runes: createPercentageEntries(getTopEntries(2, stats.runes), stats.matches),
  }
}
