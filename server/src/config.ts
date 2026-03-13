export type AppConfig = {
  apiKey: string
  getRandomMatches: boolean
  port: number
}

// Read and validate the environment variables required to boot the server.
export function getAppConfig(): AppConfig {
  // Load the Riot API key used by the HTTP handlers.
  const apiKey = process.env.RIOT_API_KEY

  // Toggle the background match collector with a simple boolean flag.
  const getRandomMatches = process.env.GET_RANDOM_MATCHES === 'true'

  // Fall back to the default local port when PORT is not defined.
  const port = Number(process.env.PORT || 3000)

  // Stop startup immediately when the Riot API key is missing.
  if (!apiKey) {
    throw new Error('RIOT_API_KEY is not defined')
  }

  return { apiKey, getRandomMatches, port }
}
