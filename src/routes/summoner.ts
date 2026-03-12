import type { BunRouteRequest, RiotAccountResponse, RiotErrorResponse, SummonerProfileResponse, SummonerResponse } from '../types'
import { riotRequest } from '../utils/riot'

// Return summoner profile data together with the latest match ids for that player.
export async function getSummonerHandler(
  req: BunRouteRequest<{ gameName: string; tagLine: string }>,
  { apiKey }: { apiKey: string },
): Promise<Response> {
  // Read the Riot ID from the route params.
  const { gameName, tagLine } = req.params

  // Resolve the Riot account first so the current flow always starts from Riot ID.
  const accountUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`

  // Fetch the Riot account and extract the PUUID from it.
  const account = await riotRequest<RiotAccountResponse | RiotErrorResponse>(accountUrl)

  // Normalize Riot errors so the frontend always receives a predictable payload.
  if (!account || 'status' in account) {
    const payload: RiotErrorResponse = account ?? { history: ['404'] }
    payload.history ??= ['404']
    return Response.json(payload)
  }

  // Load the League profile using the PUUID returned by account-v1.
  const summonerUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${apiKey}`
  const profile = await riotRequest<SummonerProfileResponse | RiotErrorResponse>(summonerUrl)

  // Stop early when the League profile cannot be resolved.
  if (!profile || 'status' in profile) {
    const payload: RiotErrorResponse = profile ?? { history: ['404'] }
    payload.history ??= ['404']
    return Response.json(payload)
  }

  const accountData = account as RiotAccountResponse
  const profileData = profile as SummonerProfileResponse

  // Build the match history endpoint using the summoner PUUID.
  const historyUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=20&api_key=${apiKey}`

  // Fetch the latest match ids for the resolved player.
  const history = await riotRequest<string[]>(historyUrl)

  // Merge Riot account data, League profile data, and the latest match ids.
  const summoner: SummonerResponse = {
    ...accountData,
    ...profileData,
    history: Array.isArray(history) ? history : [],
  }

  return Response.json(summoner)
}

// Return champion mastery data for a summoner id.
export async function getMasteryHandler(
  req: BunRouteRequest<{ id: string }>,
  { apiKey }: { apiKey: string },
): Promise<Response> {
  // Read the summoner id from the route params.
  const { id } = req.params

  // Build the Riot mastery endpoint for this summoner.
  const url = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${id}?api_key=${apiKey}`
  return Response.json(await riotRequest<unknown>(url))
}

// Return ranked queue entries for a summoner id.
export async function getEloHandler(
  req: BunRouteRequest<{ id: string }>,
  { apiKey }: { apiKey: string },
): Promise<Response> {
  // Read the summoner id from the route params.
  const { id } = req.params

  // Build the Riot ranked endpoint for this summoner.
  const url = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${apiKey}`
  return Response.json(await riotRequest<unknown>(url))
}

// Return the full details for a specific match id.
export async function getMatchHandler(
  req: BunRouteRequest<{ matchid: string }>,
  { apiKey }: { apiKey: string },
): Promise<Response> {
  // Read the match id from the route params.
  const { matchid } = req.params

  // Build the Riot match endpoint for this game.
  const url = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchid}?api_key=${apiKey}`
  return Response.json(await riotRequest<unknown>(url))
}
