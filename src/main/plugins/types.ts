export interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  installed: boolean
}

export interface PluginSearchResult {
  id: string
  name: string
  description: string
  version: string
  downloads?: number
}
