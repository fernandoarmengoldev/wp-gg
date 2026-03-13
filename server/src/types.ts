import type { Document } from 'mongodb'

export type BunRouteRequest<TParams extends Record<string, string>> = Request & {
  params: TParams
}

export type NumberMap = Record<string, number>

export interface ChampionMatchupEntry {
  id: string
  value: string
}

export interface ChampionStatEntry {
  value: string
  porcentaje: string
}

export interface ChampionStatsResponse {
  winRate?: string
  pickRate?: string
  bestFive: ChampionMatchupEntry[]
  worstFive?: ChampionMatchupEntry[]
  boots?: ChampionStatEntry[]
  items?: ChampionStatEntry[]
  spells?: ChampionStatEntry[]
  runes?: ChampionStatEntry[]
}

export interface ChampionStatsDocument extends Document, ChampionStatsResponse {
  championId: number
  matchCount: number
  role: 'top' | 'jungle' | 'mid' | 'adc' | 'supp' | 'champs_all'
  updatedAt: Date
}

export interface RiotErrorResponse {
  status?: unknown
  history?: string[]
  [key: string]: unknown
}

export interface RiotAccountResponse {
  puuid: string
  gameName: string
  tagLine: string
}

export interface SummonerProfileResponse {
  puuid: string
  id?: string
  accountId?: string
  profileIconId?: number
  summonerLevel?: number
  [key: string]: unknown
}

export interface ChampionMasterySummary {
  championId: number
  championLevel: number
}

export interface RiotLeagueEntry {
  queueType?: string
  tier?: string
  rank?: string
  leaguePoints?: number
  wins?: number
  losses?: number
  [key: string]: unknown
}

export interface SummonerResponse extends RiotAccountResponse, SummonerProfileResponse {
  history?: string[]
  elo?: RiotLeagueEntry[]
  champion_0?: ChampionMasterySummary | null
  champion_1?: ChampionMasterySummary | null
  champion_2?: ChampionMasterySummary | null
  [key: string]: unknown
}

export interface MatchPerkStyleSelection {
  perk: number
}

export interface MatchPerkStyle {
  style: number
  selections: MatchPerkStyleSelection[]
}

export interface MatchParticipant {
  championId: number
  teamId?: number
  teamPosition?: string
  individualPosition?: string
  win: boolean
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  roleBoundItem?: number
  summoner1Id: number
  summoner2Id: number
  perks: {
    statPerks: Record<string, number>
    styles: MatchPerkStyle[]
  }
}

export interface MatchDocument extends Document {
  metadata: {
    matchId?: string
    participants: string[]
  }
  info: {
    gameMode: string
    queueId?: number
    participants: MatchParticipant[]
  }
}
