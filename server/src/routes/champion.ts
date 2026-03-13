import type { Db } from 'mongodb'

import { ALL_CHAMPIONS_ROLE, CHAMPION_STATS_QUEUE_COLLECTIONS, getChampionStatsCollectionName, ROLE_KEYS } from '../scripts/champion_stats/roles'
import type { BunRouteRequest, ChampionStatsDocument, ChampionStatsResponse } from '../types'

function normalizeQueueParam(queue: string): (typeof CHAMPION_STATS_QUEUE_COLLECTIONS)[number] | null {
  switch (queue.toLowerCase()) {
    case 'solo-duo':
    case 'solo_duo':
    case 'soloduo':
      return 'solo_duo'
    case 'flex':
      return 'flex'
    case 'aram':
      return 'aram'
    default:
      return null
  }
}

function createEmptyChampionStatsResponse(): ChampionStatsResponse {
  return { bestFive: [] }
}

// Return the cached statistics document for a single champion.
export async function getChampionStatsHandler(
  req: BunRouteRequest<{ queue: string; champ: string }>,
  { db }: { db: Db },
): Promise<Response> {
  const championId = Number.parseInt(req.params.champ, 10)
  const queue = normalizeQueueParam(req.params.queue)

  if (!queue) {
    return Response.json({ message: 'Invalid queue' }, { status: 400 })
  }

  const statsByRole = await Promise.all(
    [queue].flatMap(queueName =>
      [ALL_CHAMPIONS_ROLE, ...ROLE_KEYS].map(role =>
        db
          .collection<ChampionStatsDocument>(getChampionStatsCollectionName(queueName, role))
          .findOne({ championId }, { projection: { _id: 0, championId: 0, matchCount: 0, updatedAt: 0, role: 0 } }),
      ),
    ),
  )

  const stats = (statsByRole.filter(entry => entry !== null) as ChampionStatsResponse[]).sort(
    (left, right) => Number.parseFloat(right.pickRate ?? '0') - Number.parseFloat(left.pickRate ?? '0'),
  )[0]

  return Response.json(stats ?? createEmptyChampionStatsResponse())
}
