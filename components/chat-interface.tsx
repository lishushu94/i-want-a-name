"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { Message, Conversation, DomainResult, Settings, ToolCall } from "@/lib/types"
import {
  getSettings,
  getConversations,
  saveConversation,
  deleteConversation,
  getCurrentConversationId,
  setCurrentConversationId,
  updateConversationTitle,
} from "@/lib/storage"
import {
  streamChat,
  extractDomains,
  extractDomainsFromToolCalls,
  extractDomainsUnified,
  summarizeConversationTitle,
} from "@/lib/ai-service"
import { createWhoisService } from "@/lib/whois-service"
import { ChatMessage } from "./chat-message"
import { SettingsPanel } from "./settings-panel"
import { Sidebar } from "./sidebar"
import { WelcomeScreen } from "./welcome-screen"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Bot, ArrowLeft, Languages, Check } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { ThemeToggle } from "@/components/theme-toggle"

type ViewType = "home" | "chat" | "settings"

export function ChatInterface() {
  const { t, language, setLanguage } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConvId] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>("home")
  const [mounted, setMounted] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const whoisService = useRef(createWhoisService())

  useEffect(() => {
    setMounted(true)
    const loadedSettings = getSettings()
    setSettings(loadedSettings)

    if (!loadedSettings.apiKey) {
      setViewType("settings")
    }

    const convs = getConversations()
    setConversations(convs)

    const currentId = getCurrentConversationId()
    if (currentId && loadedSettings.apiKey) {
      const conv = convs.find((c) => c.id === currentId)
      if (conv) {
        setMessages(conv.messages)
        setCurrentConvId(currentId)
        setViewType("chat")
        recheckDomainsOnLoad(conv.messages)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const recheckDomainsOnLoad = async (msgs: Message[]) => {
    for (const message of msgs) {
      // If we already have completed availability results, skip recheck
      if (message.domains && message.domains.length > 0 && message.domains.every((d) => d.available !== null)) {
        continue
      }
      // Priority 1: Use existing domains field
      if (message.domains && message.domains.length > 0) {
        const domainsToCheck = message.domains.filter((d) => d.available === null && !d.checking)
        if (domainsToCheck.length > 0) {
          checkDomainsForMessage(
            message.id,
            domainsToCheck.map((d) => ({ domain: d.domain, description: d.description })),
          )
        }
      }
      // Priority 2: Extract from tool_calls if no domains field
      else if (message.tool_calls) {
        const extractedDomains = extractDomainsFromToolCalls(message.tool_calls)
        if (extractedDomains.length > 0) {
          checkDomainsForMessage(message.id, extractedDomains)
        }
      }
      // Priority 3: Fallback to text extraction (old conversations)
      else if (message.role === "assistant") {
        const extractedDomains = extractDomains(message.content)
        if (extractedDomains.length > 0) {
          checkDomainsForMessage(message.id, extractedDomains)
        }
      }
    }
  }

  const persistMessagesWithDomains = useCallback(
    (msgs: Message[]) => {
      if (!currentConversationId) return
      const existingConv = conversations.find((c) => c.id === currentConversationId)
      if (!existingConv) return

      const conversation: Conversation = {
        ...existingConv,
        messages: msgs,
        updatedAt: Date.now(),
      }
      saveConversation(conversation)
    },
    [currentConversationId, conversations],
  )

  const checkDomainsForMessage = useCallback(
    async (messageId: string, domainList: { domain: string; description?: string }[], onComplete?: () => void) => {
      const initialResults: DomainResult[] = domainList.map((d, index) => ({
        domain: d.domain,
        description: d.description,
        available: null,
        checking: true,
        order: index,
      }))

      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === messageId ? { ...m, domains: initialResults } : m))
        return updated
      })

      for (const item of domainList) {
        const result = await whoisService.current.checkDomain(item.domain)
        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (m.id !== messageId) return m
            const updatedDomains = (m.domains || []).map((d) =>
              d.domain === item.domain
                ? { ...d, ...result, description: d.description, checkedAt: Date.now(), checking: false }
                : d,
            )
            return { ...m, domains: updatedDomains }
          })
          persistMessagesWithDomains(updated)
          return updated
        })
        await new Promise((r) => setTimeout(r, 300))
      }
      onComplete?.()
    },
    [persistMessagesWithDomains],
  )

  const saveCurrentConversation = useCallback(
    async (msgs: Message[], isNewConversation = false) => {
      if (!settings) return

      const id = currentConversationId || crypto.randomUUID()
      const title = msgs[0]?.content.slice(0, 50) || "New Conversation"

      // Merge in any domains/tool_calls from current state to persist availability cache
      const mergedMessages = msgs.map((m) => {
        const existing = messages.find((x) => x.id === m.id)
        if (existing) {
          return {
            ...m,
            tool_calls: existing.tool_calls ?? m.tool_calls,
            domains: existing.domains ?? m.domains,
          }
        }
        return m
      })

      if (isNewConversation && mergedMessages.length >= 2) {
        const conversation: Conversation = {
          id,
          title: title + (mergedMessages[0]?.content.length > 50 ? "..." : ""),
          messages: mergedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        saveConversation(conversation)
        setCurrentConversationId(id)
        setCurrentConvId(id)
        setConversations(getConversations())

        summarizeConversationTitle(mergedMessages[0]?.content || "", settings).then((summary) => {
          const updatedConv: Conversation = {
            ...conversation,
            title: summary,
            updatedAt: Date.now(),
          }
          saveConversation(updatedConv)
          setConversations(getConversations())
        })
      } else {
        const existingConv = conversations.find((c) => c.id === id)
        const conversation: Conversation = {
          id,
          title: existingConv?.title || title,
          messages: mergedMessages,
          createdAt: existingConv?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }
        saveConversation(conversation)
        setCurrentConversationId(id)
        setCurrentConvId(id)
        setConversations(getConversations())
      }
    },
    [currentConversationId, settings, conversations, messages],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !settings) return

    const isNewConversation = messages.length === 0
    const conversationId = currentConversationId || crypto.randomUUID()
    if (!currentConversationId) {
      setCurrentConvId(conversationId)
      setCurrentConversationId(conversationId)
    }
    setViewType("chat")

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }

    // Ensure an assistant message exists in state so tool-call-only responses can still be rendered/updated
    const ensureAssistantMessage = (content?: string, toolCalls?: ToolCall[]) => {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === assistantMessageId)
        if (index === -1) {
          return [
            ...prev,
            {
              ...assistantMessage,
              content: content ?? "",
              tool_calls: toolCalls?.length ? toolCalls : undefined,
            },
          ]
        }

        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          content: content ?? updated[index].content,
          tool_calls: toolCalls?.length ? toolCalls : updated[index].tool_calls,
        }
        return updated
      })
    }

    let fullContent = ""
    let accumulatedToolCalls: ToolCall[] = []

    await streamChat(
      newMessages,
      settings,
      // onChunk callback
      (chunk) => {
        fullContent += chunk
        ensureAssistantMessage(fullContent, accumulatedToolCalls)
      },
      // onToolCall callback (new)
      (toolCalls) => {
        accumulatedToolCalls = toolCalls

        // Ensure assistant message exists even if there's no text delta
        ensureAssistantMessage(fullContent, accumulatedToolCalls)

        // Immediately extract domains and start checking (improves UX)
        const extractedDomains = extractDomainsFromToolCalls(toolCalls)
        if (extractedDomains.length > 0) {
          checkDomainsForMessage(assistantMessageId, extractedDomains)
        }
      },
      // onComplete callback
      () => {
        setIsLoading(false)

        // Make sure assistant message is present even if no text chunks were streamed
        ensureAssistantMessage(fullContent, accumulatedToolCalls)

        // Unified extraction (compatible with both new and old approaches)
        const extractedDomains = extractDomainsUnified(fullContent, accumulatedToolCalls)

        // If not checked before, check now (for text-based extraction)
        if (extractedDomains.length > 0 && accumulatedToolCalls.length === 0) {
          checkDomainsForMessage(assistantMessageId, extractedDomains)
        }

        // Save message (including tool_calls)
        const finalMessage: Message = {
          ...assistantMessage,
          content: fullContent,
          tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
        }
        const finalMessages = [...newMessages, finalMessage]
        saveCurrentConversation(finalMessages, isNewConversation)
      },
      // onError callback
      (error) => {
        setIsLoading(false)
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${error}`,
            timestamp: Date.now(),
          },
        ])
      },
    )
  }

  const handleBackToHome = () => {
    setViewType("home")
    setMessages([])
    setCurrentConvId(null)
    setCurrentConversationId(null)
  }

  const handleNewConversation = () => {
    setMessages([])
    setCurrentConvId(null)
    setCurrentConversationId(null)
    setViewType("home")
  }

  const handleSelectConversation = (conv: Conversation) => {
    setMessages(conv.messages)
    setCurrentConvId(conv.id)
    setCurrentConversationId(conv.id)
    setViewType("chat")
    recheckDomainsOnLoad(conv.messages)
  }

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id)
    setConversations(getConversations())
    if (currentConversationId === id) {
      handleNewConversation()
    }
  }

  const handleUpdateTitle = (id: string, title: string) => {
    updateConversationTitle(id, title)
    setConversations(getConversations())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Avoid submitting while IME composition is active (e.g., macOS Chinese input)
    if (e.nativeEvent.isComposing) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSettingsClick = () => {
    setViewType("settings")
  }

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings)
  }

  const handleConversationsChange = (updated: Conversation[]) => {
    setConversations(updated)
  }

  const handleRefreshDomains = (messageId: string) => {
    const target = messages.find((m) => m.id === messageId)
    if (!target || !target.domains || target.domains.length === 0) return
    const domainList = target.domains.map((d) => ({ domain: d.domain, description: d.description }))
    checkDomainsForMessage(messageId, domainList)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {mounted && (
        <div className="absolute top-3 right-4 z-20 flex items-center gap-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setLanguage("en")} className="justify-between">
                English
                {language === "en" && <Check className="h-4 w-4 text-emerald-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("zh")} className="justify-between">
                中文
                {language === "zh" && <Check className="h-4 w-4 text-emerald-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <Sidebar
        conversations={conversations}
        currentId={currentConversationId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNew={handleNewConversation}
        showSettings={viewType === "settings"}
        onSettingsClick={handleSettingsClick}
        onUpdateTitle={handleUpdateTitle}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {viewType === "settings" ? (
          <SettingsPanel onSettingsChange={handleSettingsChange} onConversationsChange={handleConversationsChange} />
        ) : viewType === "home" ? (
          <>
            <header className="flex items-center justify-between px-6 py-4 shrink-0">
              <span className="text-sm text-muted-foreground">i want a name</span>
            </header>
            <WelcomeScreen input={input} setInput={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToHome}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentConversationId
                    ? conversations.find((c) => c.id === currentConversationId)?.title || "Chat"
                    : t("common.newChat")}
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="max-w-3xl mx-auto">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} onRefreshDomains={handleRefreshDomains} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-center gap-3 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("chat.thinking")}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-border/20 bg-background shrink-0">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("chat.inputPlaceholder")}
                    className="min-h-[52px] max-h-32 resize-none rounded-xl"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-[52px] w-[52px] rounded-full shrink-0 bg-primary hover:bg-primary/90 shadow-lg"
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
