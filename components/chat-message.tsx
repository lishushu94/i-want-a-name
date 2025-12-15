"use client"

import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { User, Bot, Copy, Check } from "lucide-react"
import { DomainCard } from "./domain-card"
import { useState } from "react"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface ChatMessageProps {
  message: Message
  onRefreshDomains?: (messageId: string) => void
}

export function ChatMessage({ message, onRefreshDomains }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain)
    setCopiedDomain(domain)
    setTimeout(() => setCopiedDomain(null), 2000)
  }

  const displayContent = formatContent(message.content)

  const domainsWithDescriptions = message.domains?.filter((d) => d.description) || []

  return (
    <div className={cn("flex gap-2 sm:gap-3 py-4 group", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-muted",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex-1 min-w-0", isUser ? "flex flex-col items-end" : "")}>
        {/* Copy button - only for assistant */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm",
            isUser
              ? "bg-primary text-primary-foreground max-w-[90%] sm:max-w-[80%]"
              : "bg-muted text-foreground w-full",
          )}
        >
          <div
            className="whitespace-pre-wrap break-words leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatToHtml(displayContent) }}
          />

          {!isUser && domainsWithDescriptions.length > 0 && (
            <TooltipProvider>
              <div className="mt-4 space-y-2 border-t border-border/30 pt-4">
                {domainsWithDescriptions.map((domain, index) => (
                  <div key={domain.domain} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{index + 1}.</span>
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCopyDomain(domain.domain)}
                            className="font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            {domain.domain}
                            {copiedDomain === domain.domain && <Check className="h-3 w-3 text-emerald-500" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to copy</p>
                        </TooltipContent>
                      </Tooltip>
                      {domain.description && <span className="text-muted-foreground"> - {domain.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>

        {!isUser && message.domains && message.domains.length > 0 && (
          <DomainCard domains={message.domains} messageId={message.id} onRefresh={onRefreshDomains} />
        )}
      </div>
    </div>
  )
}

function formatContent(content: string): string {
  return content.replace(/\n*```domains[\s\S]*?```\n*/g, "").trim()
}

function formatToHtml(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/^(\d+)\.\s+/gm, '<span class="font-medium text-muted-foreground mr-2">$1.</span>')
    .replace(/^[-•]\s+/gm, '<span class="text-muted-foreground mr-2">•</span>')
    .replace(/\n/g, "<br />")
}
