import type { BunRouteRequest } from '../types'
import { riotRequest } from '../utils/riot'

// Return champion mastery data for an encrypted PUUID.
export async function getMasteryHandler(
  req: BunRouteRequest<{ id: string }>,
  { apiKey }: { apiKey: string },
): Promise<Response> {
  // Read the encrypted PUUID from the route params.
  const { id } = req.params

  // Build the Riot mastery endpoint using the current by-puuid route.
  const url = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${id}?api_key=${apiKey}`
  return Response.json(await riotRequest<unknown>(url))
}
