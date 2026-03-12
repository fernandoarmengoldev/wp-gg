import type { Db } from 'mongodb'

import { getPositionsHandler, rebuildPositionsHandler } from './routes/champion-positions'
import { getChampionStatsHandler } from './routes/champion-stats'
import { getEloHandler, getMasteryHandler, getMatchHandler, getSummonerHandler } from './routes/summoner'
import type { BunRouteRequest } from './types'

// Build the Bun route table with the shared dependencies needed by each handler.
export function createRoutes({ apiKey, db }: { apiKey: string; db: Db }) {
  return {
    // Basic health endpoint used to verify that the API is running.
    '/': () => Response.json({ message: 'Server active' }),

    // Riot-backed endpoints for summoner information and live match data.
    '/api/summoner/:gameName/:tagLine': (req: Request) => getSummonerHandler(req as BunRouteRequest<{ gameName: string; tagLine: string }>, { apiKey }),
    '/api/maestry/:id': (req: Request) => getMasteryHandler(req as BunRouteRequest<{ id: string }>, { apiKey }),
    '/api/elo/:id': (req: Request) => getEloHandler(req as BunRouteRequest<{ id: string }>, { apiKey }),
    '/api/match/:matchid': (req: Request) => getMatchHandler(req as BunRouteRequest<{ matchid: string }>, { apiKey }),

    // Database-backed endpoints for champion analytics and derived position data.
    '/api/matchesFromChamp/:champ': (req: Request) => getChampionStatsHandler(req as BunRouteRequest<{ champ: string }>, { db }),
    '/api/position': () => getPositionsHandler({ db }),
    '/api/positionSetting': () => rebuildPositionsHandler({ db }),
  }
}
