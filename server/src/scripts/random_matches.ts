import type { Collection, Db } from 'mongodb'

import type { MatchDocument } from '../types'

import { printStatus } from '../banner'
import { ARAM_COLLECTION, countStoredMatches, ensureMatchIndexes, fetchAndStoreMatchIfEligible, findStoredMatchById, FLEX_COLLECTION, getMatchCollection, getRandomStoredMatch, MATCH_COLLECTIONS, SOLO_DUO_COLLECTION, type StoredMatchCollection } from './match_store'
import { riotRequest } from '../utils/riot'

const MAX_STORED_MATCHES = 10000
const RANDOM_MATCH_INTERVAL_MS = 2000

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}

async function renderMatchesProgress(db: Db): Promise<void> {
  const [totalCount, soloDuoCount, flexCount, aramCount, collectionSizes] = await Promise.all([
    countStoredMatches(db),
    db.collection<MatchDocument>(SOLO_DUO_COLLECTION).countDocuments(),
    db.collection<MatchDocument>(FLEX_COLLECTION).countDocuments(),
    db.collection<MatchDocument>(ARAM_COLLECTION).countDocuments(),
    Promise.all(
      MATCH_COLLECTIONS.map(async collectionName => {
        const stats = await db.command({ collStats: collectionName })
        const size = typeof stats.storageSize === 'number' ? stats.storageSize : typeof stats.size === 'number' ? stats.size : 0
        return size
      }),
    ),
  ])
  const totalSizeInBytes = collectionSizes.reduce((sum, size) => sum + size, 0)
  const line = `[JOB] Matches: ${totalCount} total | Solo/Duo: ${soloDuoCount}/${MAX_STORED_MATCHES} | Flex: ${flexCount}/${MAX_STORED_MATCHES} | Aram: ${aramCount}/${MAX_STORED_MATCHES} | DB size: ${formatBytes(totalSizeInBytes)}`

  if (process.stdout.isTTY) {
    process.stdout.write(`\r${line}`)
    return
  }

  printStatus('JOB', `Matches: ${totalCount} total | Solo/Duo: ${soloDuoCount}/${MAX_STORED_MATCHES} | Flex: ${flexCount}/${MAX_STORED_MATCHES} | Aram: ${aramCount}/${MAX_STORED_MATCHES} | DB size: ${formatBytes(totalSizeInBytes)}`, 'green')
}

function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)]
}

async function trimOldestMatchIfNeeded(db: Db, targetCollection: StoredMatchCollection): Promise<void> {
  const count = await getMatchCollection(db, targetCollection).countDocuments()
  if (count <= MAX_STORED_MATCHES) {
    return
  }

  await getMatchCollection(db, targetCollection).findOneAndDelete({}, { sort: { _id: 1 } })
}

export async function collectRandomMatch({ db, apiKey }: { db: Db; apiKey: string }): Promise<void> {
  await ensureMatchIndexes(db)
  const sampledMatchResult = await getRandomStoredMatch(db)
  const puuid = sampledMatchResult && randomItem(sampledMatchResult.match.metadata.participants)

  if (!puuid) {
    return
  }

  const history = await riotRequest<string[]>(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${apiKey}`)
  const matchId = Array.isArray(history) ? randomItem(history) : undefined

  if (!matchId) {
    return
  }

  const existingMatch = await findStoredMatchById(db, matchId)
  if (existingMatch) {
    await renderMatchesProgress(db)
    return
  }

  const storedMatch = await fetchAndStoreMatchIfEligible(db, apiKey, matchId)
  if (storedMatch?.storage?.inserted) {
    await trimOldestMatchIfNeeded(db, storedMatch.storage.collection)
  }

  await renderMatchesProgress(db)
}

export function startRandomMatchesJob(db: Db, apiKey: string): void {
  printStatus('JOB', `Random match collection enabled (${RANDOM_MATCH_INTERVAL_MS / 1000}s, max ${MAX_STORED_MATCHES} per type)`, 'green')
  renderMatchesProgress(db).catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    printStatus('ERROR', `Random match progress failed: ${message}`, 'red')
  })

  setInterval(() => {
    collectRandomMatch({ db, apiKey }).catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      printStatus('ERROR', `Random match collection failed: ${message}`, 'red')
    })
  }, RANDOM_MATCH_INTERVAL_MS)
}

export function logRandomMatchesDisabled(): void {
  printStatus('JOB', 'Random match collection disabled', 'yellow')
}
