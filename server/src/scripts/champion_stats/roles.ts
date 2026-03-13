import type { MatchParticipant } from '../../types'
import { ARAM_COLLECTION, FLEX_COLLECTION, SOLO_DUO_COLLECTION } from '../match_store'

export const ROLES_COLLECTION = 'roles'
export const ROLE_KEYS = ['top', 'jungle', 'mid', 'adc', 'supp'] as const
export const ALL_CHAMPIONS_ROLE = 'champs_all' as const
export const CHAMPION_STATS_QUEUE_COLLECTIONS = [SOLO_DUO_COLLECTION, FLEX_COLLECTION, ARAM_COLLECTION] as const

export type RoleKey = (typeof ROLE_KEYS)[number]
export type ChampionStatsRoleKey = RoleKey | typeof ALL_CHAMPIONS_ROLE
export type ChampionStatsQueueCollection = (typeof CHAMPION_STATS_QUEUE_COLLECTIONS)[number]
export type ChampionStatsCollectionName = `${ChampionStatsQueueCollection}_champs_${RoleKey}` | `${ChampionStatsQueueCollection}_champs_all`

export type RolesDocument = {
  collection: ChampionStatsCollectionName
  queue: ChampionStatsQueueCollection
  role: ChampionStatsRoleKey
  champions: number[]
}

export function getChampionStatsCollectionName(queue: ChampionStatsQueueCollection, role: ChampionStatsRoleKey): ChampionStatsCollectionName {
  if (role === ALL_CHAMPIONS_ROLE) {
    return `${queue}_champs_all`
  }

  return `${queue}_champs_${role}`
}

export function normalizeRole(participant: MatchParticipant): RoleKey | null {
  const rawRole = participant.teamPosition ?? participant.individualPosition
  if (!rawRole) {
    return null
  }

  switch (rawRole.toUpperCase()) {
    case 'TOP':
      return 'top'
    case 'JUNGLE':
      return 'jungle'
    case 'MIDDLE':
      return 'mid'
    case 'BOTTOM':
      return 'adc'
    case 'UTILITY':
      return 'supp'
    default:
      return null
  }
}
