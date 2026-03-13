import type { MatchParticipant, NumberMap } from '../../types'

import type { RankedEntry } from './types'

export function incrementMap(map: NumberMap, key: number | string, amount = 1): void {
  const normalizedKey = String(key)
  map[normalizedKey] = (map[normalizedKey] ?? 0) + amount
}

export function createPercentageEntries(entries: RankedEntry[], total: number): Array<{ value: string; porcentaje: string }> {
  return entries.map(entry => ({
    value: entry.name,
    porcentaje: ((entry.value / total) * 100).toFixed(2),
  }))
}

export function buildRuneKey(participant: MatchParticipant): string {
  const runeParts: string[] = []

  Object.entries(participant.perks.statPerks).forEach(([statName, value]) => {
    runeParts.push(`${statName},${value}`)
  })

  participant.perks.styles.forEach(style => {
    runeParts.push(String(style.style))
    style.selections.forEach(selection => {
      runeParts.push(String(selection.perk))
    })
  })

  return runeParts.join(',')
}

export function getTopEntries(numElem: number, hashMap: NumberMap): RankedEntry[] {
  return Object.entries(hashMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, numElem)
}

export function getBottomEntries(numElem: number, hashMap: NumberMap): RankedEntry[] {
  return Object.entries(hashMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.value - b.value)
    .slice(0, numElem)
}
