import { MongoClient, type Db } from 'mongodb'

// Fixed database name used by the application.
const DB_NAME = 'lol'

// Fail fast when MongoDB is unreachable instead of hanging during startup.
const DB_CONNECT_TIMEOUT_MS = 5000

// Create a MongoDB connection and return the application database instance.
export async function connectToDatabase(): Promise<Db> {
  // Read the connection string from the environment.
  const url = process.env.DB_URL

  // Stop early when the database URL is missing.
  if (!url) {
    throw new Error('DB_URL no esta definido')
  }

  // Create the MongoDB client with a short server selection timeout for local development.
  const client = new MongoClient(url, { serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS })

  try {
    // Open the database connection before returning the selected database.
    await client.connect()
    return client.db(DB_NAME)
  } catch (error) {
    // Throw a short startup error so Bun does not dump the full MongoDB stack twice.
    const reason = error instanceof Error ? error.message : 'Unknown database connection error'
    throw new Error(
      `Failed to connect to the database after ${DB_CONNECT_TIMEOUT_MS}ms. Check DB_URL (${url}) and make sure MongoDB is running. ${reason}`,
    )
  }
}
