"use client"

import { useState, useEffect } from "react"
import type { Settings, Registrar } from "@/lib/types"
import { DEFAULT_REGISTRARS } from "@/lib/types"
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-service"
import { getSettings, saveSettings } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Save, Check, RotateCcw, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  onSettingsChange?: (settings: Settings) => void
}

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
]

export function SettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    apiEndpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    systemPrompt: "",
    registrars: DEFAULT_REGISTRARS,
  })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRegistrar, setNewRegistrar] = useState({ name: "", url: "" })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const handleSave = () => {
    saveSettings(settings)
    onSettingsChange?.(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleResetPrompt = () => {
    setSettings({ ...settings, systemPrompt: "" })
  }

  const handleToggleRegistrar = (id: string) => {
    const registrars = (settings.registrars || DEFAULT_REGISTRARS).map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r,
    )
    setSettings({ ...settings, registrars })
  }

  const handleAddRegistrar = () => {
    if (!newRegistrar.name.trim() || !newRegistrar.url.trim()) return

    const registrar: Registrar = {
      id: `custom-${Date.now()}`,
      name: newRegistrar.name.trim(),
      url: newRegistrar.url.trim(),
      enabled: true,
    }

    setSettings({
      ...settings,
      registrars: [...(settings.registrars || DEFAULT_REGISTRARS), registrar],
    })
    setNewRegistrar({ name: "", url: "" })
    setShowAddForm(false)
  }

  const handleDeleteRegistrar = (id: string) => {
    const registrars = (settings.registrars || DEFAULT_REGISTRARS).filter((r) => r.id !== id)
    setSettings({ ...settings, registrars })
  }

  const handleResetRegistrars = () => {
    setSettings({ ...settings, registrars: DEFAULT_REGISTRARS })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="px-6 py-4 border-b border-border/50 shrink-0">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your API settings. All data is stored locally in your browser.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-8 pb-8">
          {/* API Settings Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">API Configuration</h2>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint">API Endpoint</Label>
              <Input
                id="endpoint"
                type="text"
                placeholder="https://api.openai.com/v1"
                value={settings.apiEndpoint}
                onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use custom endpoint for OpenAI-compatible APIs (e.g., Azure OpenAI, local LLM)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={settings.model} onValueChange={(value) => setSettings({ ...settings, model: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose the AI model for generating domain suggestions</p>
            </div>
          </section>

          {/* System Prompt Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">System Prompt</h2>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemPrompt">Custom Instructions</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetPrompt}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to default
                </Button>
              </div>
              <Textarea
                id="systemPrompt"
                placeholder={DEFAULT_SYSTEM_PROMPT}
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                className="font-mono text-sm min-h-[150px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Customize the AI&apos;s behavior. Leave empty to use the default prompt.
              </p>
            </div>
          </section>

          {/* Domain Registrars Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-medium">Domain Registrars</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRegistrars}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset to default
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select which registrars to show when a domain is available. Enable the ones you prefer.
            </p>

            {/* Registrar List */}
            <div className="space-y-2">
              {(settings.registrars || DEFAULT_REGISTRARS).map((registrar) => (
                <div
                  key={registrar.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    registrar.enabled ? "bg-muted/50 border-border" : "bg-muted/20 border-border/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Switch checked={registrar.enabled} onCheckedChange={() => handleToggleRegistrar(registrar.id)} />
                    <div>
                      <p className={cn("font-medium text-sm", !registrar.enabled && "text-muted-foreground")}>
                        {registrar.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{registrar.url}</p>
                    </div>
                  </div>
                  {registrar.id.startsWith("custom-") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRegistrar(registrar.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Registrar */}
            {showAddForm ? (
              <div className="p-4 rounded-lg border border-dashed border-border space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="regName">Registrar Name</Label>
                  <Input
                    id="regName"
                    placeholder="e.g., MyRegistrar"
                    value={newRegistrar.name}
                    onChange={(e) => setNewRegistrar({ ...newRegistrar, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regUrl">Registration URL</Label>
                  <Input
                    id="regUrl"
                    placeholder="e.g., https://example.com/search?domain="
                    value={newRegistrar.url}
                    onChange={(e) => setNewRegistrar({ ...newRegistrar, url: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The domain name will be appended to this URL</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddRegistrar} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed bg-transparent"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Registrar
              </Button>
            )}
          </section>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full" size="lg">
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
