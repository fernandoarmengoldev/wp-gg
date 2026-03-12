import type { Db } from 'mongodb'

import type { MatchDocument } from '../types'

import { printStatus } from '../banner'
import { riotRequest } from '../utils/riot'

// Return a random element from an array, or undefined when it is empty.
function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)]
}

// Discover one new match by walking from a stored match to a participant's recent history.
export async function collectRandomMatch({ db, apiKey }: { db: Db; apiKey: string }): Promise<void> {
  // Reuse the existing matches collection as both seed data and destination.
  const collection = db.collection<MatchDocument>('matches')

  // Start from a random stored match so the crawl spreads through the graph naturally.
  const sampledMatch = randomItem(await collection.aggregate<MatchDocument>([{ $sample: { size: 1 } }]).toArray())

  // Pick a random player from that match and use their PUUID to fetch more matches.
  const puuid = sampledMatch && randomItem(sampledMatch.metadata.participants)

  // Stop when there is no match in the database yet or no participant was available.
  if (!puuid) {
    return
  }

  // Request a small slice of that player's recent match history.
  const history = await riotRequest<string[]>(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${apiKey}`)

  // Choose one returned match id at random to avoid always following the same path.
  const matchId = Array.isArray(history) ? randomItem(history) : undefined

  // Stop if Riot did not return any usable match ids.
  if (!matchId) {
    return
  }

  // Fetch the full match payload and ignore Riot error-shaped responses.
  const match = await riotRequest<MatchDocument & { status?: unknown }>(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`)

  // Insert only valid match documents into the collection.
  if (match && !('status' in match)) {
    await collection.insertOne(match)
  }
}

// Start the background loop that periodically stores new random matches.
export function startRandomMatchesJob(db: Db, apiKey: string, intervalMs: number): void {
  // Make startup logs explicit when the collector is enabled.
  printStatus('JOB', 'Random match collection enabled', 'green')

  // Run the collector on a fixed interval and surface any runtime failures.
  setInterval(() => {
    collectRandomMatch({ db, apiKey }).catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      printStatus('ERROR', `Random match collection failed: ${message}`, 'red')
    })
  }, intervalMs)
}

// Log when random match collection is disabled by configuration.
export function logRandomMatchesDisabled(): void {
  printStatus('JOB', 'Random match collection disabled', 'yellow')
}
