// Tool call structure for OpenAI function calling
export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string // JSON string
  }
}

// Domain recommendation structure (used in function calling)
export interface DomainRecommendation {
  domain: string
  description: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  domains?: DomainResult[]
  tool_calls?: ToolCall[] // Store original tool_calls from function calling
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  importedFromId?: string
  importedAt?: number
}

export interface DomainResult {
  domain: string
  available: boolean | null
  checking: boolean
  registrar?: string
  expiryDate?: string
  error?: string
  description?: string
  order?: number // Preserve original suggested order
  checkedAt?: number
}

export interface Registrar {
  id: string
  name: string
  url: string // URL template, domain will be appended
  enabled: boolean
}

export interface AIProvider {
  id: string
  name: string
  apiKey: string
  endpoint: string
  model: string
  vendor?: string
  headers?: Record<string, string>
  availableModels?: string[]
  modelsUpdatedAt?: number
}

export interface ProviderConfig {
  apiKey: string
  endpoint: string
  model: string
  headers?: Record<string, string>
  availableModels?: string[]
  modelsUpdatedAt?: number
}

export interface Settings {
  // Current provider selection (preferred)
  activeVendor?: string
  providerConfigs?: Record<string, ProviderConfig>

  // Legacy multi-provider fields (kept for migration)
  providers?: AIProvider[]
  activeProviderId?: string

  // Legacy fields (kept for backward compatibility during migration)
  apiKey?: string
  apiEndpoint?: string
  model?: string

  systemPrompt?: string
  registrars?: Registrar[] // Add registrars to settings
  enableFunctionCalling?: boolean // Enable/disable function calling feature
}

export interface ConversationExportPayload {
  version: string
  exportedAt: string
  app?: {
    name?: string
    version?: string
    environment?: string
  }
  conversations: Conversation[]
}

export type ConversationImportStrategy = "new" | "overwrite"

// WHOIS service abstraction for future backend integration
export interface WhoisService {
  checkDomain(domain: string): Promise<DomainResult>
}

export const DEFAULT_REGISTRARS: Registrar[] = [
  {
    id: "namecheap",
    name: "Namecheap",
    url: "https://www.namecheap.com/domains/registration/results/?domain=",
    enabled: true,
  },
  { id: "godaddy", name: "GoDaddy", url: "https://www.godaddy.com/domainsearch/find?domainToCheck=", enabled: true },
  {
    id: "cloudflare",
    name: "Cloudflare",
    url: "https://dash.cloudflare.com/?to=/:account/domains/register/",
    enabled: false,
  },
  { id: "aliyun", name: "Aliyun", url: "https://wanwang.aliyun.com/domain/searchresult/?keyword=", enabled: false },
  { id: "porkbun", name: "Porkbun", url: "https://porkbun.com/checkout/search?q=", enabled: false },
  { id: "dynadot", name: "Dynadot", url: "https://www.dynadot.com/domain/search?domain=", enabled: false },
]

// OpenAI function calling tool definition for domain recommendation
export const RECOMMEND_DOMAINS_TOOL = {
  type: "function" as const,
  function: {
    name: "recommend_domains",
    description: "推荐域名给用户。当用户需要域名建议时使用此工具返回5-8个域名。",
    parameters: {
      type: "object",
      properties: {
        domains: {
          type: "array",
          description: "推荐的域名列表",
          items: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "域名，如'RecipeAI.com'",
              },
              description: {
                type: "string",
                description: "域名的含义和推荐理由",
              },
            },
            required: ["domain", "description"],
          },
          minItems: 5,
          maxItems: 8,
        },
      },
      required: ["domains"],
    },
  },
}
