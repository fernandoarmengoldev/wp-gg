import { riotRequest } from '../utils/riot'

type DataDragonItem = {
  into?: string[]
  tags?: string[]
}

type DataDragonItemResponse = {
  data?: Record<string, DataDragonItem>
}

export type ItemCatalog = {
  boots: Set<number>
  completeItems: Set<number>
  patchVersion: string
}

function createEmptyItemCatalog(patchVersion: string): ItemCatalog {
  return {
    boots: new Set<number>(),
    completeItems: new Set<number>(),
    patchVersion,
  }
}

export async function loadItemCatalog(): Promise<ItemCatalog> {
  const versions = await riotRequest<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
  const patchVersion = Array.isArray(versions) ? versions[0] : undefined
  if (!patchVersion) {
    throw new Error('No se pudo obtener la version actual de Data Dragon')
  }

  const itemData = await riotRequest<DataDragonItemResponse>(`https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/en_US/item.json`)
  if (!itemData?.data) {
    throw new Error(`No se pudo descargar item.json del parche ${patchVersion}`)
  }

  const catalog = createEmptyItemCatalog(patchVersion)

  Object.entries(itemData.data).forEach(([itemId, item]) => {
    const numericId = Number(itemId)
    if (!Number.isFinite(numericId)) {
      return
    }

    if (item.tags?.includes('Boots')) {
      catalog.boots.add(numericId)
    }

    if (!item.into || item.into.length === 0) {
      catalog.completeItems.add(numericId)
    }
  })

  return catalog
}
