import type { BunRouteRequest, ChampionMasterySummary, RiotLeagueEntry, RiotAccountResponse, RiotErrorResponse, SummonerProfileResponse, SummonerResponse } from '../types'
import { riotRequest } from '../utils/riot'

type RiotChampionMasteryResponse = {
  championId: number
  championLevel: number
}

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

  // Fetch ranked queue entries directly by PUUID so the client can load everything from one endpoint.
  const eloUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}?api_key=${apiKey}`
  const elo = await riotRequest<RiotLeagueEntry[]>(eloUrl)

  // Fetch the top champion masteries directly by PUUID and keep only the first three.
  const masteryUrl = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}?api_key=${apiKey}`
  const masteries = await riotRequest<RiotChampionMasteryResponse[]>(masteryUrl)
  const topThreeMasteries: Array<ChampionMasterySummary | null> = Array.from({ length: 3 }, (_, index) => {
    const mastery = Array.isArray(masteries) ? masteries[index] : undefined
    if (!mastery) {
      return null
    }

    return {
      championId: mastery.championId,
      championLevel: mastery.championLevel,
    }
  })

  // Merge Riot account data, League profile data, and the latest match ids.
  const summoner: SummonerResponse = {
    ...accountData,
    ...profileData,
    history: Array.isArray(history) ? history : [],
    elo: Array.isArray(elo) ? elo : [],
    champion_0: topThreeMasteries[0],
    champion_1: topThreeMasteries[1],
    champion_2: topThreeMasteries[2],
  }

  return Response.json(summoner)
}
