export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  domains?: DomainResult[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface DomainResult {
  domain: string
  available: boolean | null
  checking: boolean
  registrar?: string
  expiryDate?: string
  error?: string
  description?: string
}

export interface Registrar {
  id: string
  name: string
  url: string // URL template, domain will be appended
  enabled: boolean
}

export interface Settings {
  apiKey: string
  apiEndpoint: string
  model: string
  systemPrompt?: string
  registrars?: Registrar[] // Add registrars to settings
}

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
