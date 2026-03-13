import type { Db } from 'mongodb'

import { printStatus } from '../../banner'
import type { ChampionStatsDocument, ChampionStatsResponse, MatchDocument, MatchParticipant } from '../../types'
import { FLEX_COLLECTION, SOLO_DUO_COLLECTION } from '../match_store'
import {
  ALL_CHAMPIONS_ROLE,
  CHAMPION_STATS_QUEUE_COLLECTIONS,
  getChampionStatsCollectionName,
  ROLE_KEYS,
  ROLES_COLLECTION,
  type ChampionStatsCollectionName,
  type ChampionStatsQueueCollection,
  type ChampionStatsRoleKey,
  type RoleKey,
  type RolesDocument,
  normalizeRole,
} from './roles'
import { loadItemCatalog } from '../item_catalog'
import { createItems, updateItems } from './items'
import { createMatchups, updateMatchups } from './matchups'
import { createPickRate } from './pickrate'
import { createRunes, updateRunes } from './runes'
import { createSpells, updateSpells } from './spells'
import { createChampionStatsAccumulator, type ChampionStatsAccumulator } from './types'
import { createWinRate, updateWinrate } from './winrate'

export const MIN_ROLE_PICK_RATE = 1
const STARTUP_PROGRESS_BAR_WIDTH = 28

function createEmptyChampionStatsResponse(): ChampionStatsResponse {
  return { bestFive: [] }
}

function createRoleTotals(): Record<RoleKey, number> {
  return {
    top: 0,
    jungle: 0,
    mid: 0,
    adc: 0,
    supp: 0,
  }
}

function createRoleChampionStatsMaps(): Record<RoleKey, Record<string, ChampionStatsAccumulator>> {
  return {
    top: {},
    jungle: {},
    mid: {},
    adc: {},
    supp: {},
  }
}

function createQueueRoleTotals(): Record<ChampionStatsQueueCollection, Record<RoleKey, number>> {
  return {
    [SOLO_DUO_COLLECTION]: createRoleTotals(),
    [FLEX_COLLECTION]: createRoleTotals(),
    aram: createRoleTotals(),
  }
}

function createQueueAllTotals(): Record<ChampionStatsQueueCollection, number> {
  return {
    [SOLO_DUO_COLLECTION]: 0,
    [FLEX_COLLECTION]: 0,
    aram: 0,
  }
}

function createQueueRoleChampionStatsMaps(): Record<ChampionStatsQueueCollection, Record<RoleKey, Record<string, ChampionStatsAccumulator>>> {
  return {
    [SOLO_DUO_COLLECTION]: createRoleChampionStatsMaps(),
    [FLEX_COLLECTION]: createRoleChampionStatsMaps(),
    aram: createRoleChampionStatsMaps(),
  }
}

function createQueueAllChampionStatsMaps(): Record<ChampionStatsQueueCollection, Record<string, ChampionStatsAccumulator>> {
  return {
    [SOLO_DUO_COLLECTION]: {},
    [FLEX_COLLECTION]: {},
    aram: {},
  }
}

function parsePickRate(pickRate: string | undefined): number {
  return Number.parseFloat(pickRate ?? '0') || 0
}

function parseWinRate(winRate: string | undefined): number {
  return Number.parseFloat(winRate ?? '0') || 0
}

function renderStartupProgress(processedMatches: number, totalMatches: number): void {
  if (!process.stdout.isTTY || totalMatches <= 0) {
    return
  }

  const progress = Math.min(processedMatches / totalMatches, 1)
  const filledWidth = Math.round(progress * STARTUP_PROGRESS_BAR_WIDTH)
  const emptyWidth = STARTUP_PROGRESS_BAR_WIDTH - filledWidth
  const bar = `${'='.repeat(filledWidth)}${' '.repeat(emptyWidth)}`
  const percent = Math.round(progress * 100)

  process.stdout.write(`\r[LOAD] Champion stats [${bar}] ${percent}% (${processedMatches}/${totalMatches})`)

  if (processedMatches >= totalMatches) {
    process.stdout.write('\n')
  }
}

function buildChampionResponse(stats: ChampionStatsAccumulator, totalRoleMatches: number): ChampionStatsResponse {
  if (stats.matches === 0 || totalRoleMatches === 0) {
    return createEmptyChampionStatsResponse()
  }

  return {
    winRate: createWinRate(stats),
    pickRate: createPickRate(stats, totalRoleMatches),
    ...createMatchups(stats),
    ...createItems(stats),
    ...createSpells(stats),
    ...createRunes(stats),
  }
}

function findRoleOpponent(participants: MatchParticipant[], currentParticipant: MatchParticipant, role: RoleKey): MatchParticipant | undefined {
  return participants.find(participant => participant !== currentParticipant && participant.teamId !== currentParticipant.teamId && normalizeRole(participant) === role)
}

function findAramOpponent(participants: MatchParticipant[], currentParticipant: MatchParticipant): MatchParticipant | undefined {
  return participants.find(participant => participant !== currentParticipant && participant.teamId !== currentParticipant.teamId)
}

async function clearChampionStatsCollections(db: Db): Promise<void> {
  await Promise.all([
    ...CHAMPION_STATS_QUEUE_COLLECTIONS.flatMap(queue =>
      [ALL_CHAMPIONS_ROLE, ...ROLE_KEYS].map(role => db.collection<ChampionStatsDocument>(getChampionStatsCollectionName(queue, role)).deleteMany({})),
    ),
    db.collection<RolesDocument>(ROLES_COLLECTION).deleteMany({}),
  ])
}

async function buildRoleStatsDocuments(
  db: Db,
): Promise<{ patchVersion: string; roleDocuments: Record<ChampionStatsCollectionName, ChampionStatsDocument[]>; rolesDocuments: RolesDocument[] }> {
  const totalClassicMatches = (
    await Promise.all(CHAMPION_STATS_QUEUE_COLLECTIONS.map(queue => db.collection<MatchDocument>(queue).countDocuments()))
  ).reduce((sum, count) => sum + count, 0)
  const queueRoleTotals = createQueueRoleTotals()
  const queueAllTotals = createQueueAllTotals()
  const queueRoleChampionStatsMaps = createQueueRoleChampionStatsMaps()
  const queueAllChampionStatsMaps = createQueueAllChampionStatsMaps()
  const itemCatalog = await loadItemCatalog()
  let processedMatches = 0

  renderStartupProgress(0, totalClassicMatches)

  for (const queue of CHAMPION_STATS_QUEUE_COLLECTIONS) {
    const matchesCollection = db.collection<MatchDocument>(queue)

    for await (const match of matchesCollection.find()) {
      match.info.participants.forEach(participant => {
        const championId = participant.championId
        queueAllTotals[queue] += 1
        const allChampionStats = (queueAllChampionStatsMaps[queue][String(championId)] ??= createChampionStatsAccumulator())

        updateWinrate(allChampionStats, participant.win)

        const allEnemyParticipant = queue === 'aram' ? findAramOpponent(match.info.participants, participant) : undefined
        if (allEnemyParticipant) {
          updateMatchups(allChampionStats, allEnemyParticipant.championId, participant.win)
        }

        updateItems(allChampionStats, participant, queue === 'aram' ? 'adc' : 'mid', itemCatalog)
        updateSpells(allChampionStats, [participant.summoner1Id, participant.summoner2Id])
        updateRunes(allChampionStats, participant)

        if (queue === 'aram') {
          return
        }

        const role = normalizeRole(participant)
        if (!role) {
          return
        }

        queueRoleTotals[queue][role] += 1
        const championStats = (queueRoleChampionStatsMaps[queue][role][String(championId)] ??= createChampionStatsAccumulator())

        updateWinrate(championStats, participant.win)

        const enemyParticipant = findRoleOpponent(match.info.participants, participant, role)
        if (enemyParticipant) {
          updateMatchups(championStats, enemyParticipant.championId, participant.win)
        }

        updateItems(championStats, participant, role, itemCatalog)
        updateSpells(championStats, [participant.summoner1Id, participant.summoner2Id])
        updateRunes(championStats, participant)
      })

      processedMatches += 1
      renderStartupProgress(processedMatches, totalClassicMatches)
    }
  }

  const updatedAt = new Date()
  const roleDocuments = {} as Record<ChampionStatsCollectionName, ChampionStatsDocument[]>
  const rolesDocuments: RolesDocument[] = []

  CHAMPION_STATS_QUEUE_COLLECTIONS.forEach(queue => {
    const allCollectionName = getChampionStatsCollectionName(queue, ALL_CHAMPIONS_ROLE)
    const allDocuments = Object.entries(queueAllChampionStatsMaps[queue])
      .map(([championId, stats]) => ({
        championId: Number(championId),
        matchCount: stats.matches,
        role: ALL_CHAMPIONS_ROLE,
        updatedAt,
        ...buildChampionResponse(stats, queueAllTotals[queue]),
      }))
      .sort((left, right) => parsePickRate(right.pickRate) - parsePickRate(left.pickRate))

    roleDocuments[allCollectionName] = allDocuments
    rolesDocuments.push({
      collection: allCollectionName,
      queue,
      role: ALL_CHAMPIONS_ROLE,
      champions: [...allDocuments].sort((left, right) => parseWinRate(right.winRate) - parseWinRate(left.winRate)).map(document => document.championId),
    })

    if (queue === 'aram') {
      return
    }

    ROLE_KEYS.forEach(role => {
      const totalRoleMatches = queueRoleTotals[queue][role]
      const collectionName = getChampionStatsCollectionName(queue, role)
      const documents = Object.entries(queueRoleChampionStatsMaps[queue][role])
        .map(([championId, stats]) => ({
          championId: Number(championId),
          matchCount: stats.matches,
          role,
          updatedAt,
          ...buildChampionResponse(stats, totalRoleMatches),
        }))
        .filter(document => parsePickRate(document.pickRate) >= MIN_ROLE_PICK_RATE)
        .sort((left, right) => parsePickRate(right.pickRate) - parsePickRate(left.pickRate))

      const championsByWinRate = [...documents]
        .sort((left, right) => parseWinRate(right.winRate) - parseWinRate(left.winRate))
        .map(document => document.championId)

      roleDocuments[collectionName] = documents
      rolesDocuments.push({
        collection: collectionName,
        queue,
        role,
        champions: championsByWinRate,
      })
    })
  })

  return { patchVersion: itemCatalog.patchVersion, roleDocuments, rolesDocuments }
}

export async function rebuildChampionStats(db: Db): Promise<{ patchVersion: string; championCount: number }> {
  const { patchVersion, roleDocuments, rolesDocuments } = await buildRoleStatsDocuments(db)

  await clearChampionStatsCollections(db)

  let championCount = 0

  for (const queue of CHAMPION_STATS_QUEUE_COLLECTIONS) {
    for (const role of [ALL_CHAMPIONS_ROLE, ...ROLE_KEYS] as ChampionStatsRoleKey[]) {
      if (queue === 'aram' && role !== ALL_CHAMPIONS_ROLE) {
        continue
      }

      const collectionName = getChampionStatsCollectionName(queue, role)
      const collection = db.collection<ChampionStatsDocument>(collectionName)
      await collection.createIndex({ championId: 1 }, { unique: true })

      const documents = roleDocuments[collectionName] ?? []
      championCount += documents.length

      if (documents.length > 0) {
        await collection.insertMany(documents)
      }
    }
  }

  const rolesCollection = db.collection<RolesDocument>(ROLES_COLLECTION)
  await rolesCollection.dropIndex('role_1').catch(() => undefined)
  await rolesCollection.createIndex({ collection: 1 }, { unique: true })
  if (rolesDocuments.length > 0) {
    await rolesCollection.insertMany(rolesDocuments)
  }

  return { patchVersion, championCount }
}

export async function refreshChampionStatsCache(db: Db): Promise<void> {
  const matchCount = (
    await Promise.all(CHAMPION_STATS_QUEUE_COLLECTIONS.map(queue => db.collection<MatchDocument>(queue).countDocuments()))
  ).reduce((sum, count) => sum + count, 0)
  if (matchCount === 0) {
    await clearChampionStatsCollections(db)
    printStatus('JOB', 'Champion stats and roles caches cleared: no stored matches', 'yellow')
    return
  }

  const { patchVersion, championCount } = await rebuildChampionStats(db)
  printStatus('JOB', `Champion stats rebuilt for ${championCount} role entries using patch ${patchVersion}`, 'green')
}
