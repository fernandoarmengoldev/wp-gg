import type { Db } from 'mongodb'

import { ROLES_COLLECTION, type RolesDocument } from '../scripts/champion_stats/roles'

// Return the cached champion role data stored in the database.
export async function getRolesHandler({ db }: { db: Db }): Promise<Response> {
  const roles = await db.collection<RolesDocument>(ROLES_COLLECTION).find().project({ _id: 0, collection: 1, queue: 1, role: 1, champions: 1 }).toArray()
  return Response.json(roles)
}
