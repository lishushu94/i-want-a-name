import type { AIProvider, ProviderConfig, Settings } from "./types"
import { detectVendorFromEndpoint, getProviderPreset } from "./provider-catalog"

export type ResolvedProviderConfig = {
  id: string
  name: string
  vendor: string
  apiKey: string
  apiEndpoint: string
  model: string
  headers?: Record<string, string>
}

function coalesceString(...values: Array<string | undefined | null>): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return ""
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

function resolveFromVendorConfig(settings: Settings): ResolvedProviderConfig | null {
  const vendor = settings.activeVendor?.trim()
  if (!vendor) return null

  const config = (settings.providerConfigs?.[vendor] ?? null) as ProviderConfig | null
  const preset = getProviderPreset(vendor)

  const apiEndpointRaw = coalesceString(config?.endpoint, preset?.defaultEndpoint, settings.apiEndpoint)
  const model = coalesceString(config?.model, preset?.defaultModel, settings.model)
  const apiKey = coalesceString(config?.apiKey, settings.apiKey)
  const apiEndpoint = apiEndpointRaw ? normalizeBaseUrl(apiEndpointRaw) : ""

  const headers =
    preset?.defaultHeaders || config?.headers
      ? {
          ...(preset?.defaultHeaders ?? {}),
          ...(config?.headers ?? {}),
        }
      : undefined

  return {
    id: vendor,
    name: preset?.label ?? vendor,
    vendor,
    apiKey,
    apiEndpoint,
    model,
    headers,
  }
}

export function getActiveProvider(settings: Settings): AIProvider | null {
  const providers = settings.providers ?? []
  if (providers.length > 0) {
    const activeId = settings.activeProviderId
    return providers.find((p) => p.id === activeId) ?? providers[0] ?? null
  }

  // Legacy fallback (pre multi-provider)
  const apiKey = coalesceString(settings.apiKey)
  const endpoint = coalesceString(settings.apiEndpoint)
  const model = coalesceString(settings.model)
  if (!apiKey && !endpoint && !model) return null

  return {
    id: "legacy",
    name: "Legacy",
    apiKey,
    endpoint,
    model,
    vendor: detectVendorFromEndpoint(endpoint),
  }
}

export function resolveProviderConfig(settings: Settings): ResolvedProviderConfig | null {
  const fromVendorConfig = resolveFromVendorConfig(settings)
  if (fromVendorConfig) return fromVendorConfig

  const provider = getActiveProvider(settings)
  if (!provider) return null

  const vendor = (provider as any).vendor || detectVendorFromEndpoint(provider.endpoint)
  const preset = getProviderPreset(vendor)

  const apiEndpointRaw = coalesceString(provider.endpoint, preset?.defaultEndpoint, settings.apiEndpoint)
  const model = coalesceString(provider.model, preset?.defaultModel, settings.model)
  const apiKey = coalesceString(provider.apiKey, settings.apiKey)

  const apiEndpoint = apiEndpointRaw ? normalizeBaseUrl(apiEndpointRaw) : ""

  const providerHeaders = (provider as any).headers as Record<string, string> | undefined
  const headers =
    preset?.defaultHeaders || providerHeaders
      ? {
          ...(preset?.defaultHeaders ?? {}),
          ...(providerHeaders ?? {}),
        }
      : undefined

  return {
    id: provider.id,
    name: provider.name,
    vendor,
    apiKey,
    apiEndpoint,
    model,
    headers,
  }
}
