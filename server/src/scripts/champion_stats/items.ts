import type { MatchParticipant } from '../../types'
import type { RoleKey } from './roles'

import { createPercentageEntries, getTopEntries, incrementMap } from './shared'
import type { ItemCatalog } from '../item_catalog'
import type { ChampionStatsAccumulator } from './types'

function getParticipantItemSlots(participant: MatchParticipant): number[] {
  return [participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].filter(item => item > 0)
}

function getBootIds(participant: MatchParticipant, role: RoleKey, itemCatalog: ItemCatalog): number[] {
  const boots = new Set(getParticipantItemSlots(participant).filter(item => itemCatalog.boots.has(item)))

  if (role === 'adc' && participant.roleBoundItem && itemCatalog.boots.has(participant.roleBoundItem)) {
    boots.add(participant.roleBoundItem)
  }

  return Array.from(boots)
}

function getCompleteItemIds(participant: MatchParticipant, itemCatalog: ItemCatalog, maxItems: number): number[] {
  return getParticipantItemSlots(participant)
    .filter(item => !itemCatalog.boots.has(item) && itemCatalog.completeItems.has(item))
    .slice(0, maxItems)
}

export function updateItems(stats: ChampionStatsAccumulator, participant: MatchParticipant, role: RoleKey, itemCatalog: ItemCatalog): void {
  getBootIds(participant, role, itemCatalog).forEach(bootId => {
    incrementMap(stats.boots, bootId)
  })

  const maxItems = role === 'adc' ? 6 : 5
  getCompleteItemIds(participant, itemCatalog, maxItems).forEach(itemId => {
    incrementMap(stats.items, itemId)
  })
}

export function createItems(stats: ChampionStatsAccumulator): Pick<import('../../types').ChampionStatsResponse, 'boots' | 'items'> {
  return {
    boots: createPercentageEntries(getTopEntries(2, stats.boots), stats.matches),
    items: createPercentageEntries(getTopEntries(5, stats.items), stats.matches),
  }
}
