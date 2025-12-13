export type ProviderVendorKind = "openai_compatible"

export type ProviderVendorId =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "zhipu"
  | "siliconflow"
  | "custom_openai_compatible"

export type ProviderPreset = {
  id: ProviderVendorId
  kind: ProviderVendorKind
  label: string
  enabled: boolean
  defaultEndpoint?: string
  defaultModel?: string
  models?: string[]
  supportsTools?: boolean
  apiKeyHelpUrl?: string
  defaultHeaders?: Record<string, string>
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    kind: "openai_compatible",
    label: "OpenAI",
    enabled: true,
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-5-chat", "gpt-4o", "gpt-4o-mini"],
    supportsTools: true,
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    kind: "openai_compatible",
    label: "OpenRouter",
    enabled: true,
    defaultEndpoint: "https://openrouter.ai/api/v1",
    apiKeyHelpUrl: "https://openrouter.ai/keys",
    // Models vary; keep empty and let user type or paste.
  },
  {
    id: "deepseek",
    kind: "openai_compatible",
    label: "DeepSeek",
    enabled: true,
    defaultEndpoint: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    supportsTools: true,
  },
  {
    id: "zhipu",
    kind: "openai_compatible",
    label: "智谱 (BigModel)",
    enabled: true,
    defaultEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4.6",
    models: ["glm-4.6"],
    supportsTools: true,
    apiKeyHelpUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  },
  {
    id: "siliconflow",
    kind: "openai_compatible",
    label: "硅基流动 (SiliconFlow)",
    enabled: false,
  },
  {
    id: "custom_openai_compatible",
    kind: "openai_compatible",
    label: "Custom (OpenAI-compatible)",
    enabled: true,
  },
]

export function getProviderPreset(id?: string | null): ProviderPreset | undefined {
  if (!id) return undefined
  return PROVIDER_PRESETS.find((p) => p.id === id)
}

export function detectVendorFromEndpoint(endpoint?: string | null): ProviderVendorId {
  const value = (endpoint || "").trim().toLowerCase()
  if (!value) return "custom_openai_compatible"

  const match = PROVIDER_PRESETS.find((p) => p.defaultEndpoint && value.startsWith(p.defaultEndpoint.toLowerCase()))
  return match?.id ?? "custom_openai_compatible"
}
