import { defineCollection } from 'astro:content'
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders'
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Cadeas da UI de Starlight en galego: as incluídas son parciais e
  // con erros ortográficos («paxina»); aquí van completas e correctas.
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
}
