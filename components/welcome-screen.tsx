"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Sparkles, Search, Zap } from "lucide-react"
import type React from "react"

interface WelcomeScreenProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

export function WelcomeScreen({ input, setInput, onSubmit, isLoading }: WelcomeScreenProps) {
  const suggestions = [
    "I'm building an AI-powered writing assistant",
    "I need a domain for my food delivery startup",
    "Looking for a catchy name for my SaaS product",
    "Help me find a domain for my photography portfolio",
  ]

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Suggestions",
      description: "Get creative domain ideas based on your business description",
    },
    {
      icon: Search,
      title: "Real-time Availability",
      description: "Instantly check if domains are available for registration",
    },
    {
      icon: Zap,
      title: "Quick Registration",
      description: "One-click links to popular domain registrars",
    },
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Hero */}
        <h1 className="text-4xl font-bold mb-3">Find Your Perfect Domain</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Describe your business, and let AI suggest the perfect domain names for you.
        </p>

        {/* Input */}
        <form onSubmit={onSubmit} className="mb-8">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me about your business or project..."
              className="min-h-[120px] resize-none rounded-xl pr-14 text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-3 right-3 h-10 w-10 rounded-lg"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="mb-12">
          <p className="text-sm text-muted-foreground mb-3">Try one of these:</p>
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
