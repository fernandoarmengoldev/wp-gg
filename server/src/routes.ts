import type { Db } from 'mongodb'

import { getChampionStatsHandler } from './routes/champion'
import { getRolesHandler } from './routes/roles'
import { getMasteryHandler } from './routes/mastery'
import { getMatchHandler } from './routes/match'
import { getSummonerHandler } from './routes/summoner'
import type { BunRouteRequest } from './types'

// Build the Bun route table with the shared dependencies needed by each handler.
export function createRoutes({ apiKey, db }: { apiKey: string; db: Db }) {
  return {
    // Basic health endpoint used to verify that the API is running.
    '/': () => Response.json({ message: 'Server active' }),

    // Riot-backed endpoints for summoner information and live match data.
    '/summoner/:gameName/:tagLine': (req: Request) => getSummonerHandler(req as BunRouteRequest<{ gameName: string; tagLine: string }>, { apiKey }),
    '/mastery/:id': (req: Request) => getMasteryHandler(req as BunRouteRequest<{ id: string }>, { apiKey }),
    '/match/:matchid': (req: Request) => getMatchHandler(req as BunRouteRequest<{ matchid: string }>, { apiKey, db }),

    // Database-backed endpoints for champion analytics and derived role data.
    '/champion-stats/:queue/:champ': (req: Request) => getChampionStatsHandler(req as BunRouteRequest<{ queue: string; champ: string }>, { db }),
    '/roles': () => getRolesHandler({ db }),
  }
}
