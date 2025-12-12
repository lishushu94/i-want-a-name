"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Sparkles, Search, Zap } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import type React from "react"

interface WelcomeScreenProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  disableSubmit?: boolean
  warning?: string | null
}

export function WelcomeScreen({ input, setInput, onSubmit, isLoading, disableSubmit, warning }: WelcomeScreenProps) {
  const { t } = useI18n()

  const suggestions = [
    t("welcome.suggestion1"),
    t("welcome.suggestion2"),
    t("welcome.suggestion3"),
    t("welcome.suggestion4"),
  ]

  const features = [
    {
      icon: Sparkles,
      title: t("features.title1"),
      description: t("features.desc1"),
    },
    {
      icon: Search,
      title: t("features.title2"),
      description: t("features.desc2"),
    },
    {
      icon: Zap,
      title: t("features.title3"),
      description: t("features.desc3"),
    },
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Avoid submitting while IME composition is active (e.g., macOS Chinese input)
    if ((e.nativeEvent as any).isComposing) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disableSubmit) {
        onSubmit(e)
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Hero */}
        <h1 className="text-4xl font-bold mb-3">{t("welcome.title")}</h1>
        <p className="text-lg text-muted-foreground mb-8">{t("welcome.subtitle")}</p>

        {/* Input */}
        <form onSubmit={onSubmit} className="mb-8">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("welcome.placeholder")}
              className="min-h-[120px] resize-none rounded-xl pr-14 text-base"
              disabled={isLoading || disableSubmit}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-3 right-3 h-10 w-10 rounded-lg"
              disabled={isLoading || !input.trim() || disableSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {warning && <p className="text-xs text-destructive mt-2 text-left">{warning}</p>}
        </form>

        {/* Suggestions */}
        <div className="mb-12">
          <p className="text-sm text-muted-foreground mb-3">{t("welcome.tryOne")}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center p-4">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 mb-3">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
