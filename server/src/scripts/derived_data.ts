import type { Db } from 'mongodb'

import { printStatus } from '../banner'
import { refreshChampionStatsCache } from './champion_stats'

const DERIVED_DATA_INTERVAL_MS = 60 * 60 * 1000

export async function startDerivedDataJobs(db: Db): Promise<void> {
  printStatus('JOB', 'Derived caches enabled (startup + 1h)', 'green')

  let isRunning = false

  const runRefresh = async (): Promise<void> => {
    if (isRunning) {
      printStatus('JOB', 'Derived cache rebuild skipped: previous run still active', 'yellow')
      return
    }

    isRunning = true

    try {
      await refreshChampionStatsCache(db)
    } finally {
      isRunning = false
    }
  }

  await runRefresh()

  setInterval(() => {
    runRefresh().catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      printStatus('ERROR', `Derived cache rebuild failed: ${message}`, 'red')
    })
  }, DERIVED_DATA_INTERVAL_MS)
}
