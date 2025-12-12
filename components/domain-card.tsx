"use client"

import { useEffect, useState } from "react"
import type { DomainResult, Registrar } from "@/lib/types"
import { DEFAULT_REGISTRARS } from "@/lib/types"
import { getSettings } from "@/lib/storage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface DomainCardProps {
  domains: DomainResult[]
  messageId?: string
  onRefresh?: (messageId: string) => void
}

export function DomainCard({ domains, messageId, onRefresh }: DomainCardProps) {
  const [registrars, setRegistrars] = useState<Registrar[]>([])
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null)

  useEffect(() => {
    const settings = getSettings()
    const enabledRegistrars = (settings.registrars || DEFAULT_REGISTRARS).filter((r) => r.enabled)
    setRegistrars(enabledRegistrars)
  }, [])

  const handleCopyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain)
    setCopiedDomain(domain)
    setTimeout(() => setCopiedDomain(null), 2000)
  }

  if (domains.length === 0) return null

  const availableCount = domains.filter((d) => d.available === true).length
  const unavailableCount = domains.filter((d) => d.available === false).length
  const checkingCount = domains.filter((d) => d.checking).length
  const lastChecked = domains.reduce<number | null>((acc, curr) => {
    if (curr.checkedAt) {
      return acc ? Math.min(acc, curr.checkedAt) : curr.checkedAt
    }
    return acc
  }, null)

  // Preserve original suggestion order; fallback to current index for older saved messages
  const orderedDomains = [...domains]
    .map((d, idx) => ({ ...d, order: d.order ?? idx }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <TooltipProvider>
      <div className="mt-3 rounded-lg border border-border bg-card p-4 w-full">
        {/* Header with stats */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Domain Availability</span>
            {lastChecked && (
              <span className="text-xs text-muted-foreground">
                Last checked {new Date(lastChecked).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {availableCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                {availableCount} available
              </Badge>
            )}
            {unavailableCount > 0 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                {unavailableCount} taken
              </Badge>
            )}
            {checkingCount > 0 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                {checkingCount} checking
              </Badge>
            )}
            {onRefresh && messageId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onRefresh(messageId)}
                disabled={checkingCount > 0}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Domain list */}
        <div className="space-y-2">
          {orderedDomains.map((domain) => (
            <DomainRow
              key={domain.domain}
              domain={domain}
              registrars={registrars}
              onCopy={handleCopyDomain}
              copied={copiedDomain === domain.domain}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

function DomainRow({
  domain,
  registrars,
  onCopy,
  copied,
}: {
  domain: DomainResult
  registrars: Registrar[]
  onCopy: (domain: string) => void
  copied: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-md transition-colors",
        domain.available === true && "bg-emerald-500/5 hover:bg-emerald-500/10",
        domain.available === false && "bg-muted/30 opacity-60",
        domain.checking && "bg-muted/20",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {domain.checking ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : domain.available === true ? (
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onCopy(domain.domain)}
                className={cn(
                  "font-mono text-sm block truncate cursor-pointer hover:underline inline-flex items-center gap-1",
                  domain.available === true && "text-foreground font-medium",
                  domain.available === false && "text-muted-foreground line-through",
                )}
              >
                {domain.domain}
                {copied && <Check className="h-3 w-3 text-emerald-500" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to copy</p>
            </TooltipContent>
          </Tooltip>
          {domain.registrar && (
            <span className="text-xs text-muted-foreground sm:shrink-0 sm:text-right">
              Registrar: {domain.registrar}
            </span>
          )}
        </div>
      </div>

      {domain.available === true && registrars.length > 0 && (
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          {registrars.map((registrar) => (
            <Button
              key={registrar.id}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-emerald-200 dark:border-emerald-800 bg-background/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium transition-all"
              onClick={() => window.open(registrar.url + domain.domain, "_blank")}
            >
              {registrar.name}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
