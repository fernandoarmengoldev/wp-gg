import type { Db } from 'mongodb'

import { fetchAndStoreMatchIfEligible, findStoredMatchById } from '../scripts/match_store'
import type { BunRouteRequest } from '../types'
import { riotRequest } from '../utils/riot'

// Return the full details for a specific match id.
export async function getMatchHandler(
  req: BunRouteRequest<{ matchid: string }>,
  { apiKey, db }: { apiKey: string; db: Db },
): Promise<Response> {
  // Read the match id from the route params.
  const { matchid } = req.params

  const localMatch = await findStoredMatchById(db, matchid)
  if (localMatch) {
    return Response.json(localMatch.match)
  }

  // Build the Riot match endpoint for this game.
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchid}?api_key=${apiKey}`
  const storedMatch = await fetchAndStoreMatchIfEligible(db, apiKey, matchid)
  if (storedMatch) {
    return Response.json(storedMatch.match)
  }

  return Response.json(await riotRequest<unknown>(url))
}
