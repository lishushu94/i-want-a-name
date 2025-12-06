import type { Conversation, Settings, Registrar } from "./types"
import { DEFAULT_REGISTRARS } from "./types"

const STORAGE_KEYS = {
  SETTINGS: "iwantaname_settings",
  CONVERSATIONS: "iwantaname_conversations",
  CURRENT_CONVERSATION: "iwantaname_current_conversation",
}

export function getSettings(): Settings {
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      apiEndpoint: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      systemPrompt: "",
      registrars: DEFAULT_REGISTRARS,
    }
  }
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  if (stored) {
    const parsed = JSON.parse(stored)
    // Ensure all fields exist for backward compatibility
    return {
      ...parsed,
      systemPrompt: parsed.systemPrompt ?? "",
      registrars: parsed.registrars ?? DEFAULT_REGISTRARS,
    }
  }
  return {
    apiKey: "",
    apiEndpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    systemPrompt: "",
    registrars: DEFAULT_REGISTRARS,
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
