import { createInterface } from 'node:readline/promises'
import type { Db } from 'mongodb'

import { printStatus } from '../banner'
import type { MatchDocument, RiotAccountResponse } from '../types'
import { countStoredMatches, ensureMatchIndexes, insertMatchIfMissing, resolveMatchCollection } from './match_store'
import { riotRequest } from '../utils/riot'

type SeedAccountResponse = RiotAccountResponse & {
  puuid: string
}

function parseRiotId(riotId: string): { gameName: string; tagLine: string } {
  const [gameName, tagLine] = riotId.split('#')
  if (!gameName || !tagLine) {
    throw new Error('El Riot ID debe tener formato nombre#tag')
  }

  return { gameName: gameName.trim(), tagLine: tagLine.trim() }
}

async function promptRiotId(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('La base de datos esta vacia y no hay terminal interactiva para pedir un Riot ID inicial')
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    const riotId = await rl.question('Base de datos vacia. Introduce un Riot ID inicial (nombre#tag): ')
    return riotId.trim()
  } finally {
    rl.close()
  }
}

export async function seedLatestMatchForRiotId({ apiKey, db, riotId }: { apiKey: string; db: Db; riotId: string }): Promise<string> {
  const { gameName, tagLine } = parseRiotId(riotId)

  const accountUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
  const account = await riotRequest<SeedAccountResponse>(accountUrl)
  if (!account?.puuid) {
    throw new Error(`No se pudo resolver el Riot ID ${riotId}`)
  }

  const historyUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=20&api_key=${apiKey}`
  const history = await riotRequest<string[]>(historyUrl)
  const matchIds = Array.isArray(history) ? history : []
  if (matchIds.length === 0) {
    throw new Error(`No se encontro ninguna partida reciente para ${riotId}`)
  }

  for (const matchId of matchIds) {
    const matchUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`
    const match = await riotRequest<MatchDocument & { status?: unknown }>(matchUrl)
    if (!match || 'status' in match) {
      continue
    }

    const collectionName = resolveMatchCollection(match)
    if (!collectionName) {
      continue
    }

    await insertMatchIfMissing(db, match)
    return matchId
  }

  throw new Error(`No se encontro ninguna partida solo/duo, flex o aram reciente para ${riotId}`)
}

export async function ensureSeedMatch({ apiKey, db }: { apiKey: string; db: Db }): Promise<void> {
  await ensureMatchIndexes(db)

  const matchCount = await countStoredMatches(db)
  if (matchCount > 0) {
    return
  }

  printStatus('SEED', 'No hay partidas guardadas; hace falta una semilla inicial', 'yellow')
  const riotId = await promptRiotId()
  const matchId = await seedLatestMatchForRiotId({ apiKey, db, riotId })
  printStatus('SEED', `Partida inicial guardada: ${matchId}`, 'green')
}
