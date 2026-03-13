import 'dotenv/config'

import { printReadyBanner, printStartupBanner, printStatus } from './banner'
import { getAppConfig } from './config'
import { connectToDatabase } from './db/db'
import { createRoutes } from './routes'
import { startDerivedDataJobs } from './scripts/derived_data'
import { logRandomMatchesDisabled, startRandomMatchesJob } from './scripts/random_matches'
import { ensureSeedMatch } from './scripts/seed_match'

// Create a JSON response with a custom HTTP status code.
function createJsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status })
}

// Boot the database connection, optional background jobs, and the Bun HTTP server.
async function startServer(): Promise<void> {
  // Load the validated runtime configuration for the application.
  const { apiKey, getRandomMatches, port } = getAppConfig()

  await printStartupBanner()
  printStatus('DB', 'Connecting to database...', 'blue')

  // Connect to MongoDB before exposing the API routes.
  const db = await connectToDatabase()
  printStatus('DB', 'Connected', 'green')

  // Seed the database with one recent match when starting from an empty state.
  await ensureSeedMatch({ apiKey, db })

  // Build cached derived data once at boot and refresh it on a fixed background interval.
  await startDerivedDataJobs(db)

  // Start or skip the background match collector based on the environment flag.
  if (getRandomMatches) {
    startRandomMatchesJob(db, apiKey)
  } else {
    logRandomMatchesDisabled()
  }

  // Start the HTTP server with the assembled route table and shared handlers.
  const server = Bun.serve({
    port,
    routes: createRoutes({ apiKey, db }),
    fetch() {
      return createJsonResponse({ message: 'Not Found' }, 404)
    },
    error(error) {
      const message = error instanceof Error ? error.message : String(error)
      printStatus('ERROR', message, 'red')
      return createJsonResponse({ message: 'Internal Server Error' }, 500)
    },
  })

  // Log the final listening port after Bun finishes booting the server.
  printReadyBanner(server.port ?? port)
}

// Exit with a failure code when startup cannot complete successfully.
startServer().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  printStatus('ERROR', message, 'red')
  process.exit(1)
})
