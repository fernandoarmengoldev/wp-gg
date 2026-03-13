import type { Collection, Db } from 'mongodb'

import type { MatchDocument } from '../types'
import { riotRequest } from '../utils/riot'

export const SOLO_DUO_COLLECTION = 'solo_duo'
export const FLEX_COLLECTION = 'flex'
export const ARAM_COLLECTION = 'aram'
export const MATCH_COLLECTIONS = [SOLO_DUO_COLLECTION, FLEX_COLLECTION, ARAM_COLLECTION] as const

export type StoredMatchCollection = (typeof MATCH_COLLECTIONS)[number]

function isSoloDuoMatch(match: MatchDocument): boolean {
  return match.info.queueId === 420
}

function isFlexMatch(match: MatchDocument): boolean {
  return match.info.queueId === 440
}

function isAramMatch(match: MatchDocument): boolean {
  return match.info.queueId === 450 || match.info.gameMode === 'ARAM'
}

export function resolveMatchCollection(match: MatchDocument): StoredMatchCollection | null {
  if (isSoloDuoMatch(match)) {
    return SOLO_DUO_COLLECTION
  }

  if (isFlexMatch(match)) {
    return FLEX_COLLECTION
  }

  if (isAramMatch(match)) {
    return ARAM_COLLECTION
  }

  return null
}

export async function ensureMatchIndexes(db: Db): Promise<void> {
  await Promise.all(
    MATCH_COLLECTIONS.map(collectionName =>
      db.collection<MatchDocument>(collectionName).createIndex({ 'metadata.matchId': 1 }, { unique: true, sparse: true }),
    ),
  )
}

export async function countStoredMatches(db: Db): Promise<number> {
  const counts = await Promise.all(MATCH_COLLECTIONS.map(collectionName => db.collection<MatchDocument>(collectionName).countDocuments()))
  return counts.reduce((sum, count) => sum + count, 0)
}

export async function findStoredMatchById(db: Db, matchId: string): Promise<{ collection: StoredMatchCollection; match: MatchDocument } | null> {
  for (const collectionName of MATCH_COLLECTIONS) {
    const match = await db.collection<MatchDocument>(collectionName).findOne({ 'metadata.matchId': matchId })
    if (match) {
      return { collection: collectionName, match }
    }
  }

  return null
}

export async function insertMatchIfMissing(db: Db, match: MatchDocument): Promise<{ collection: StoredMatchCollection; inserted: boolean } | null> {
  const collectionName = resolveMatchCollection(match)
  if (!collectionName) {
    return null
  }

  const collection = db.collection<MatchDocument>(collectionName)
  const matchId = match.metadata.matchId

  if (!matchId) {
    await collection.insertOne(match)
    return { collection: collectionName, inserted: true }
  }

  const result = await collection.updateOne({ 'metadata.matchId': matchId }, { $setOnInsert: match }, { upsert: true })
  return { collection: collectionName, inserted: Boolean(result.upsertedCount) }
}

export async function fetchAndStoreMatchIfEligible(
  db: Db,
  apiKey: string,
  matchId: string,
): Promise<{ match: MatchDocument; storage: { collection: StoredMatchCollection; inserted: boolean } | null } | null> {
  const match = await riotRequest<MatchDocument & { status?: unknown }>(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`)
  if (!match || 'status' in match) {
    return null
  }

  const storage = await insertMatchIfMissing(db, match)
  return { match, storage }
}

export async function getRandomStoredMatch(db: Db): Promise<{ collection: StoredMatchCollection; match: MatchDocument } | null> {
  const collections = [...MATCH_COLLECTIONS]

  while (collections.length > 0) {
    const index = Math.floor(Math.random() * collections.length)
    const [collectionName] = collections.splice(index, 1)
    if (!collectionName) {
      continue
    }

    const collection = db.collection<MatchDocument>(collectionName)
    const match = (await collection.aggregate<MatchDocument>([{ $sample: { size: 1 } }]).toArray())[0]
    if (match) {
      return { collection: collectionName, match }
    }
  }

  return null
}

export function getMatchCollection(db: Db, collectionName: StoredMatchCollection): Collection<MatchDocument> {
  return db.collection<MatchDocument>(collectionName)
}
