"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { Message, Conversation, DomainResult, Settings } from "@/lib/types"
import {
  getSettings,
  getConversations,
  saveConversation,
  deleteConversation,
  getCurrentConversationId,
  setCurrentConversationId,
  updateConversationTitle,
} from "@/lib/storage"
import { streamChat, extractDomains, summarizeConversationTitle } from "@/lib/ai-service"
import { createWhoisService } from "@/lib/whois-service"
import { ChatMessage } from "./chat-message"
import { SettingsPanel } from "./settings-panel"
import { Sidebar } from "./sidebar"
import { WelcomeScreen } from "./welcome-screen"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Bot, ArrowLeft } from "lucide-react"

type ViewType = "home" | "chat" | "settings"

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConvId] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>("home")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const whoisService = useRef(createWhoisService())

  useEffect(() => {
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
      if (message.domains && message.domains.length > 0) {
        const domainsToCheck = message.domains.filter((d) => d.available === null && !d.checking)
        if (domainsToCheck.length > 0) {
          checkDomainsForMessage(
            message.id,
            domainsToCheck.map((d) => ({ domain: d.domain, description: d.description })),
          )
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
    async (messageId: string, domainList: { domain: string; description?: string }[]) => {
      const initialResults: DomainResult[] = domainList.map((d) => ({
        domain: d.domain,
        description: d.description,
        available: null,
        checking: true,
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
              d.domain === item.domain ? { ...result, description: d.description } : d,
            )
            return { ...m, domains: updatedDomains }
          })
          persistMessagesWithDomains(updated)
          return updated
        })
        await new Promise((r) => setTimeout(r, 300))
      }
    },
    [persistMessagesWithDomains],
  )

  const saveCurrentConversation = useCallback(
    async (msgs: Message[], isNewConversation = false) => {
      if (!settings) return

      const id = currentConversationId || crypto.randomUUID()
      const title = msgs[0]?.content.slice(0, 50) || "New Conversation"

      if (isNewConversation && msgs.length >= 2) {
        const conversation: Conversation = {
          id,
          title: title + (msgs[0]?.content.length > 50 ? "..." : ""),
          messages: msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        saveConversation(conversation)
        setCurrentConversationId(id)
        setCurrentConvId(id)
        setConversations(getConversations())

        summarizeConversationTitle(msgs[0]?.content || "", settings).then((summary) => {
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
          messages: msgs,
          createdAt: existingConv?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }
        saveConversation(conversation)
        setCurrentConversationId(id)
        setCurrentConvId(id)
        setConversations(getConversations())
      }
    },
    [currentConversationId, settings, conversations],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !settings) return

    const isNewConversation = messages.length === 0
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

    let fullContent = ""

    await streamChat(
      newMessages,
      settings,
      (chunk) => {
        fullContent += chunk
        setMessages((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (updated[lastIndex]?.role === "assistant") {
            updated[lastIndex] = { ...updated[lastIndex], content: fullContent }
          } else {
            updated.push({ ...assistantMessage, content: fullContent })
          }
          return updated
        })
      },
      () => {
        setIsLoading(false)
        const extractedDomains = extractDomains(fullContent)
        if (extractedDomains.length > 0) {
          checkDomainsForMessage(assistantMessageId, extractedDomains)
        }
        const finalMessages = [...newMessages, { ...assistantMessage, content: fullContent }]
        saveCurrentConversation(finalMessages, isNewConversation)
      },
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
          <SettingsPanel onSettingsChange={handleSettingsChange} />
        ) : viewType === "home" ? (
          <>
            <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <span className="text-sm text-muted-foreground">Home</span>
            </header>
            <WelcomeScreen input={input} setInput={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToHome}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentConversationId
                    ? conversations.find((c) => c.id === currentConversationId)?.title || "Chat"
                    : "New Chat"}
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="max-w-3xl mx-auto">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-center gap-3 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-background shrink-0">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask for more suggestions or refine your requirements..."
                    className="min-h-[52px] max-h-32 resize-none rounded-xl"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-[52px] w-[52px] rounded-xl shrink-0"
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
