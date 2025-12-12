import type {
  Conversation,
  Settings,
  Registrar,
  AIProvider,
  ConversationExportPayload,
  ConversationImportStrategy,
  Message,
} from "./types"
import { DEFAULT_REGISTRARS } from "./types"

const STORAGE_KEYS = {
  SETTINGS: "iwantaname_settings",
  CONVERSATIONS: "iwantaname_conversations",
  CURRENT_CONVERSATION: "iwantaname_current_conversation",
}

const EXPORT_VERSION = "1.0.0"
const APP_NAME = "i want a name"

export function getSettings(): Settings {
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      apiEndpoint: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      systemPrompt: "",
      registrars: DEFAULT_REGISTRARS,
      providers: [],
    }
  }
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  if (stored) {
    const parsed = JSON.parse(stored)
    const settings = {
      ...parsed,
      systemPrompt: parsed.systemPrompt ?? "",
      registrars: parsed.registrars ?? DEFAULT_REGISTRARS,
    }

    // Migration: If no providers but has legacy key
    if ((!settings.providers || settings.providers.length === 0) && settings.apiKey) {
      const defaultProvider: AIProvider = {
        id: "default",
        name: "Default Provider",
        apiKey: settings.apiKey,
        endpoint: settings.apiEndpoint || "https://api.openai.com/v1",
        model: settings.model || "gpt-4o-mini",
      }
      settings.providers = [defaultProvider]
      settings.activeProviderId = "default"
    }

    if (!settings.providers) {
      settings.providers = []
    }

    return settings
  }
  return {
    apiKey: "",
    apiEndpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    systemPrompt: "",
    registrars: DEFAULT_REGISTRARS,
    providers: [],
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
  return stored ? JSON.parse(stored) : []
}

export function saveConversation(conversation: Conversation): void {
  const conversations = getConversations()
  const index = conversations.findIndex((c) => c.id === conversation.id)
  if (index >= 0) {
    conversations[index] = conversation
  } else {
    conversations.unshift(conversation)
  }
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations))
}

export function deleteConversation(id: string): void {
  const conversations = getConversations().filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations))
}

export function updateConversationTitle(id: string, title: string): void {
  const conversations = getConversations()
  const index = conversations.findIndex((c) => c.id === id)
  if (index >= 0) {
    conversations[index].title = title
    conversations[index].updatedAt = Date.now()
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations))
  }
}

export function getCurrentConversationId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION)
}

export function setCurrentConversationId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id)
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION)
  }
}

export function getEnabledRegistrars(): Registrar[] {
  const settings = getSettings()
  return (settings.registrars || DEFAULT_REGISTRARS).filter((r) => r.enabled)
}

const generateId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
}

const sanitizeMessage = (raw: any): Message | null => {
  if (!raw || typeof raw !== "object") return null
  if (raw.role !== "user" && raw.role !== "assistant") return null

  const message: Message = {
    id: typeof raw.id === "string" ? raw.id : generateId("msg"),
    role: raw.role,
    content: typeof raw.content === "string" ? raw.content : "",
    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
  }

  if (Array.isArray(raw.domains)) {
    message.domains = raw.domains
  }

  if (Array.isArray(raw.tool_calls)) {
    message.tool_calls = raw.tool_calls
  }

  return message
}

const isMessage = (msg: Message | null): msg is Message => Boolean(msg)

const sanitizeConversation = (raw: any): Conversation | null => {
  if (!raw || typeof raw !== "object") return null

  const messages = Array.isArray(raw.messages) ? raw.messages.map(sanitizeMessage).filter(isMessage) : []

  const conversation: Conversation = {
    id: typeof raw.id === "string" ? raw.id : generateId("conv"),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Imported Conversation",
    messages,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  }

  return conversation
}

export const buildConversationExportPayload = (
  conversations?: Conversation[],
  appMeta?: ConversationExportPayload["app"],
): ConversationExportPayload => {
  const data = conversations ?? getConversations()
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: APP_NAME,
      ...appMeta,
    },
    conversations: data,
  }
}

export const importConversationsFromPayload = (
  payload: ConversationExportPayload,
  strategy: ConversationImportStrategy = "new",
) => {
  if (typeof window === "undefined") {
    return { imported: 0, messages: 0, conversations: [] as Conversation[] }
  }

  const sourceConversations = Array.isArray(payload?.conversations) ? payload.conversations : []
  const validConversations = sourceConversations
    .map(sanitizeConversation)
    .filter((conv): conv is Conversation => conv !== null)

  const importedMessages = validConversations.reduce((sum, conv) => sum + conv.messages.length, 0)

  let merged: Conversation[] = getConversations()

  if (strategy === "overwrite") {
    const incomingIds = new Set(validConversations.map((c) => c.id))
    merged = [
      ...validConversations,
      ...merged.filter((conv) => !incomingIds.has(conv.id)),
    ]
  } else {
    const remapped = validConversations.map<Conversation>((conv) => ({
      ...conv,
      id: generateId("conv"),
      importedFromId: conv.id,
      importedAt: Date.now(),
      createdAt: conv.createdAt || Date.now(),
      updatedAt: Date.now(),
      messages: (conv.messages || []).map((msg) => ({
        ...msg,
        id: msg.id || generateId("msg"),
      })),
    }))
    merged = [...remapped, ...merged]
  }

  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(merged))

  return {
    imported: validConversations.length,
    messages: importedMessages,
    conversations: merged,
  }
}
