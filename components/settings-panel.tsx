"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { Settings, Registrar, ProviderConfig, Conversation } from "@/lib/types"
import { DEFAULT_REGISTRARS } from "@/lib/types"
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_WITH_TOOLS } from "@/lib/ai-service"
import {
  buildConversationExportPayload,
  getConversations,
  getSettings,
  importConversationsFromPayload,
  saveSettings,
} from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Check, RotateCcw, Plus, Trash2, Upload, Download, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"
import { PROVIDER_PRESETS, getProviderPreset } from "@/lib/provider-catalog"
import { fetchOpenRouterModels } from "@/lib/openrouter"

interface SettingsPanelProps {
  onSettingsChange?: (settings: Settings) => void
  onConversationsChange?: (conversations: Conversation[]) => void
}

const MODELS = [
  { value: "gpt-5-chat", label: "gpt-5-chat" },
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
]

export function SettingsPanel({ onSettingsChange, onConversationsChange }: SettingsPanelProps) {
  const { t, language, setLanguage } = useI18n()
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    apiEndpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    systemPrompt: "",
    registrars: DEFAULT_REGISTRARS,
    activeVendor: "openai",
    providerConfigs: {
      openai: {
        apiKey: "",
        endpoint: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      },
    },
  })

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string>("all")
  const [dataInfo, setDataInfo] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [copiedDefaultPrompt, setCopiedDefaultPrompt] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pendingSettingsRef = useRef<Settings | null>(null)

  const [showKey, setShowKey] = useState(false)
  const [newRegistrar, setNewRegistrar] = useState({ name: "", url: "" })
  const [showAddForm, setShowAddForm] = useState(false)
  const [modelsSyncStatus, setModelsSyncStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle")
  const [modelsSyncMessage, setModelsSyncMessage] = useState<string | null>(null)

  const activeVendor = settings.activeVendor || "openai"
  const activePreset = getProviderPreset(activeVendor)
  const activeConfig: ProviderConfig = settings.providerConfigs?.[activeVendor] ?? {
    apiKey: "",
    endpoint: activePreset?.defaultEndpoint ?? "https://api.openai.com/v1",
    model: activePreset?.defaultModel ?? "gpt-4o-mini",
  }
  const modelOptions =
    activeConfig.availableModels && activeConfig.availableModels.length > 0
      ? activeConfig.availableModels.map((m) => ({ value: m, label: m }))
      : activePreset?.models && activePreset.models.length > 0
        ? activePreset.models.map((m) => ({ value: m, label: m }))
        : MODELS

  const updateActiveConfig = (patch: Partial<ProviderConfig>) => {
    const nextConfig: ProviderConfig = { ...activeConfig, ...patch }
    const nextSettings: Settings = {
      ...settings,
      activeVendor,
      providerConfigs: {
        ...(settings.providerConfigs ?? {}),
        [activeVendor]: nextConfig,
      },
      apiKey: nextConfig.apiKey,
      apiEndpoint: nextConfig.endpoint,
      model: nextConfig.model,
    }
    setSettings(nextSettings)
    triggerAutoSave(nextSettings)
  }

  const handleSyncModels = async () => {
    if (activePreset?.id !== "openrouter") return
    if (!activeConfig.apiKey?.trim()) {
      setModelsSyncStatus("error")
      setModelsSyncMessage(t("settings.modelsSyncNeedKey"))
      return
    }

    setModelsSyncStatus("syncing")
    setModelsSyncMessage(null)
    try {
      const extraHeaders: Record<string, string> = {
        ...(activeConfig.headers ?? {}),
      }
      if (typeof window !== "undefined") {
        extraHeaders["HTTP-Referer"] ||= window.location.origin
        extraHeaders["X-Title"] ||= "i want a name"
      }

      const models = await fetchOpenRouterModels(activeConfig.endpoint, activeConfig.apiKey, extraHeaders)
      updateActiveConfig({
        availableModels: models,
        modelsUpdatedAt: Date.now(),
        headers: extraHeaders,
      })

      setModelsSyncStatus("ok")
      setModelsSyncMessage(`${t("settings.modelsSyncOk")} (${models.length})`)
      setTimeout(() => setModelsSyncStatus("idle"), 2000)
    } catch (error) {
      setModelsSyncStatus("error")
      setModelsSyncMessage(error instanceof Error ? error.message : t("settings.modelsSyncFailed"))
    }
  }

  useEffect(() => {
    const loaded = getSettings()
    setSettings(loaded)
    setConversations(getConversations())
    setUseCustomPrompt(Boolean(loaded.systemPrompt && loaded.systemPrompt.trim().length > 0))
  }, [])

  const triggerAutoSave = (nextSettings: Settings) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pendingSettingsRef.current = nextSettings
    setAutoSaveStatus("saving")
    saveTimer.current = setTimeout(() => {
      try {
        saveSettings(nextSettings)
        onSettingsChange?.(nextSettings)
        pendingSettingsRef.current = null
        setAutoSaveStatus("saved")
        setTimeout(() => setAutoSaveStatus("idle"), 1500)
      } catch (error) {
        console.error("Auto-save failed:", error)
        setAutoSaveStatus("error")
      }
    }, 500)
  }

  const handleResetPrompt = () => {
    setSettings({ ...settings, systemPrompt: "" })
    setUseCustomPrompt(false)
    triggerAutoSave({ ...settings, systemPrompt: "" })
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }

      if (pendingSettingsRef.current) {
        try {
          saveSettings(pendingSettingsRef.current)
        } catch (error) {
          console.error("Failed to flush pending settings:", error)
        } finally {
          pendingSettingsRef.current = null
        }
      }
    }
  }, [])

  const handleToggleRegistrar = (id: string) => {
    const registrars = (settings.registrars || DEFAULT_REGISTRARS).map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r,
    )
    const next = { ...settings, registrars }
    setSettings(next)
    triggerAutoSave(next)
  }

  const handleAddRegistrar = () => {
    if (!newRegistrar.name.trim() || !newRegistrar.url.trim()) return

    const registrar: Registrar = {
      id: `custom-${Date.now()}`,
      name: newRegistrar.name.trim(),
      url: newRegistrar.url.trim(),
      enabled: true,
    }

    const next = {
      ...settings,
      registrars: [...(settings.registrars || DEFAULT_REGISTRARS), registrar],
    }
    setSettings(next)
    triggerAutoSave(next)
    setNewRegistrar({ name: "", url: "" })
    setShowAddForm(false)
  }

  const handleDeleteRegistrar = (id: string) => {
    const registrars = (settings.registrars || DEFAULT_REGISTRARS).filter((r) => r.id !== id)
    const next = { ...settings, registrars }
    setSettings(next)
    triggerAutoSave(next)
  }

  const handleResetRegistrars = () => {
    const next = { ...settings, registrars: DEFAULT_REGISTRARS }
    setSettings(next)
    triggerAutoSave(next)
  }

  const refreshConversations = (next?: Conversation[]) => {
    const updated = next ?? getConversations()
    setConversations(updated)
    if (selectedConversationId !== "all" && !updated.find((c) => c.id === selectedConversationId)) {
      setSelectedConversationId("all")
    }
    onConversationsChange?.(updated)
  }

  const downloadJson = (payload: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatFileName = (scope: string) => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
    const cleanScope = scope.replace(/[^a-z0-9-_]+/gi, "-") || "conversation"
    return `conversations-${cleanScope}-${stamp}-v1.json`
  }

  const handleExport = () => {
    setDataError(null)
    setDataInfo(null)

    const targets =
      selectedConversationId === "all"
        ? conversations
        : conversations.filter((conv) => conv.id === selectedConversationId)

    if (!targets || targets.length === 0) {
      setDataError(t("settings.exportEmpty"))
      return
    }

    const payload = buildConversationExportPayload(targets, { environment: window.location.origin })
    const nameSeed =
      selectedConversationId === "all" ? "all" : targets[0]?.title || targets[0]?.id || "conversation"

    downloadJson(payload, formatFileName(nameSeed.toLowerCase()))
    setDataInfo(t("settings.exportSuccess"))
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setDataError(null)
    setDataInfo(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = importConversationsFromPayload(parsed, "new")

      if (result.imported === 0) {
        setDataError(t("settings.importNoData"))
      } else {
        refreshConversations(result.conversations)
        setSelectedConversationId("all")
        setDataInfo(
          `${t("settings.importSuccess")}: ${result.imported} ${t("settings.importConversationsLabel")} / ${result.messages} ${t("settings.importMessagesLabel")}`,
        )
      }
    } catch (error) {
      console.error("Failed to import conversations", error)
      setDataError(t("settings.importError"))
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const defaultPrompt =
    settings.enableFunctionCalling === false ? DEFAULT_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT_WITH_TOOLS

  const handleCopyDefaultPrompt = async () => {
    try {
      await navigator.clipboard.writeText(defaultPrompt)
      setCopiedDefaultPrompt(true)
      setTimeout(() => setCopiedDefaultPrompt(false), 2000)
    } catch (error) {
      console.error("Failed to copy default prompt", error)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="px-6 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.description")}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-8 pb-8">
          {/* Provider Selection Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">{t("settings.apiConfig")}</h2>
            <div className="space-y-2">
              <Label htmlFor="providerPreset">{t("settings.providerPreset")}</Label>
              <Select
                value={activeVendor}
                onValueChange={(value) => {
                  const preset = getProviderPreset(value)
                  const existing = settings.providerConfigs?.[value]
                  const nextConfig: ProviderConfig =
                    existing ?? {
                      apiKey: "",
                      endpoint: preset?.defaultEndpoint ?? "https://api.openai.com/v1",
                      model: preset?.defaultModel ?? "gpt-4o-mini",
                      headers: preset?.defaultHeaders,
                    }

                  const nextSettings: Settings = {
                    ...settings,
                    activeVendor: value,
                    providerConfigs: {
                      ...(settings.providerConfigs ?? {}),
                      [value]: nextConfig,
                    },
                    apiKey: nextConfig.apiKey,
                    apiEndpoint: nextConfig.endpoint,
                    model: nextConfig.model,
                  }
                  setSettings(nextSettings)
                  triggerAutoSave(nextSettings)
                }}
              >
                <SelectTrigger id="providerPreset">
                  <SelectValue placeholder={t("settings.providerPreset")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} disabled={!preset.enabled}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("settings.providerPresetDesc")}</p>
            </div>
          </section>

          {/* API Settings Section */}
          <section className="space-y-4 p-4 border rounded-lg bg-muted/20">

	              <div className="space-y-2">
	                <Label htmlFor="apiKey">{t("settings.apiKey")}</Label>
	                <div className="flex gap-2">
	                  <Input
	                    id="apiKey"
	                    type={showKey ? "text" : "password"}
	                    placeholder="sk-..."
	                    value={activeConfig.apiKey}
	                    onChange={(e) => updateActiveConfig({ apiKey: e.target.value })}
	                    className="font-mono text-sm"
	                  />
	                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
	                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
	                  </Button>
	                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.apiKeyDesc")}
                  {activePreset?.apiKeyHelpUrl ? (
                    <>
                      {" "}
                      <a
                        href={activePreset.apiKeyHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {t("settings.apiKeyHelpLink")}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>

	              <div className="space-y-2">
	                <Label htmlFor="endpoint">{t("settings.apiEndpoint")}</Label>
	                  <Input
	                    id="endpoint"
	                    type="text"
	                    placeholder={activePreset?.defaultEndpoint ?? "https://api.openai.com/v1"}
	                    value={activeConfig.endpoint}
	                    onChange={(e) => updateActiveConfig({ endpoint: e.target.value })}
	                    className="font-mono text-sm"
	                  />
                <p className="text-xs text-muted-foreground">{t("settings.apiEndpointDesc")}</p>
	              </div>
	
	              <div className="space-y-2">
	                <div className="flex items-center justify-between gap-2">
	                  <Label htmlFor="model">{t("settings.model")}</Label>
	                  {activePreset?.id === "openrouter" && (
	                    <Button
	                      type="button"
	                      variant="outline"
	                      size="sm"
	                      onClick={handleSyncModels}
	                      disabled={modelsSyncStatus === "syncing"}
	                    >
	                      {modelsSyncStatus === "syncing" ? t("settings.modelsSyncing") : t("settings.modelsSync")}
	                    </Button>
	                  )}
	                </div>
		                <Select
		                  value={activeConfig.model}
		                  onValueChange={(value) => updateActiveConfig({ model: value })}
		                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
	                  </SelectContent>
	                </Select>
	                {activePreset?.id === "openrouter" && modelsSyncMessage && (
	                  <p
	                    className={cn(
	                      "text-xs",
	                      modelsSyncStatus === "error" ? "text-destructive" : "text-muted-foreground",
	                    )}
	                  >
	                    {modelsSyncMessage}
	                  </p>
	                )}
	                <div className="space-y-1 mt-2">
	                  <Label htmlFor="customModel" className="text-xs text-muted-foreground">
	                    {t("settings.customModelLabel")}
	                  </Label>
	                  <Input
	                    id="customModel"
	                    placeholder="custom-model-name"
	                    value={activeConfig.model}
	                    onChange={(e) => updateActiveConfig({ model: e.target.value })}
	                    className="font-mono text-sm"
	                  />
                  <p className="text-xs text-muted-foreground">{t("settings.modelDesc")}</p>
                </div>
              </div>
            </section>

          {/* System Prompt Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">{t("settings.systemPrompt")}</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="use-custom-prompt"
                    checked={useCustomPrompt}
                    onCheckedChange={(checked) => {
                      setUseCustomPrompt(checked)
                      if (!checked) {
                        const next = { ...settings, systemPrompt: "" }
                        setSettings(next)
                        triggerAutoSave(next)
                      }
                    }}
                  />
                  <Label htmlFor="use-custom-prompt" className="text-sm">
                    {t("settings.useCustomPrompt")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPrompt}
                    disabled={!useCustomPrompt}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t("settings.resetDefault")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyDefaultPrompt} className="h-7 text-xs">
                    {copiedDefaultPrompt ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {t("settings.copyDefault")}
                  </Button>
                </div>
              </div>

              {useCustomPrompt && (
                <>
              <Textarea
                id="systemPrompt"
                placeholder={defaultPrompt}
                value={settings.systemPrompt}
                onChange={(e) => {
                  const next = { ...settings, systemPrompt: e.target.value }
                  setSettings(next)
                  triggerAutoSave(next)
                }}
                className="font-mono text-sm min-h-[150px] resize-y"
              />
                  <p className="text-xs text-muted-foreground">{t("settings.customInstructionsDesc")}</p>
                </>
              )}

              {!useCustomPrompt && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("settings.defaultPromptDesc")}</p>
                  <div className="p-3 border rounded-lg bg-muted/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("settings.defaultPromptTitle")}</p>
                        <p className="text-xs text-muted-foreground">
                          {settings.enableFunctionCalling === false
                            ? t("settings.defaultPromptText")
                            : t("settings.defaultPromptTools")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleCopyDefaultPrompt} className="h-7 text-xs">
                        {copiedDefaultPrompt ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {t("settings.copyDefault")}
                      </Button>
                    </div>
                    <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-auto">
                      {defaultPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Advanced Settings Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">{t("settings.advanced")}</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enable-function-calling">Function Calling (实验性)</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="enable-function-calling"
                    checked={settings.enableFunctionCalling ?? true}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, enableFunctionCalling: checked }
                      setSettings(next)
                      triggerAutoSave(next)
                    }}
                  />
                  <span className="text-sm text-muted-foreground">使用结构化工具调用推荐域名</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  启用后将使用 OpenAI function calling（需要支持的模型），否则使用文本格式提取。推荐保持启用以获得更可靠的域名推荐。
                </p>
              </div>
            </div>
          </section>

          {/* Data Export / Import Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">{t("settings.dataTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.dataDesc")}</p>

            <div className="space-y-2">
              <Label>{t("settings.exportLabel")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedConversationId} onValueChange={(val) => setSelectedConversationId(val)}>
                  <SelectTrigger className="sm:w-[260px]">
                    <SelectValue placeholder={t("settings.selectConversation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("settings.exportAllOption")}</SelectItem>
                    {conversations.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id}>
                        {conv.title || t("common.newChat")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="secondary">
                    <Upload className="h-4 w-4 mr-2" />
                    {t("settings.exportButton")}
                  </Button>
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Download className="h-4 w-4 mr-2" />
                    {t("settings.importButton")}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.dataHelper")}</p>
              {dataInfo && <p className="text-xs text-emerald-600">{dataInfo}</p>}
              {dataError && <p className="text-xs text-destructive">{dataError}</p>}
            </div>
          </section>

          {/* Domain Registrars Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-medium">{t("settings.registrars")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRegistrars}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t("settings.resetDefault")}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{t("settings.registrarsDesc")}</p>

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
                  <Label htmlFor="regName">{t("settings.registrarName")}</Label>
                  <Input
                    id="regName"
                    placeholder="e.g., MyRegistrar"
                    value={newRegistrar.name}
                    onChange={(e) => setNewRegistrar({ ...newRegistrar, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regUrl">{t("settings.registrarUrl")}</Label>
                  <Input
                    id="regUrl"
                    placeholder="e.g., https://example.com/search?domain="
                    value={newRegistrar.url}
                    onChange={(e) => setNewRegistrar({ ...newRegistrar, url: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.registrarUrlDesc")}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddRegistrar} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("settings.add")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    {t("common.cancel")}
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
                {t("settings.addRegistrar")}
              </Button>
            )}
          </section>
          {autoSaveStatus !== "idle" && (
            <p
              className={cn(
                "text-sm",
                autoSaveStatus === "error" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {autoSaveStatus === "saving"
                ? t("common.saving")
                : autoSaveStatus === "saved"
                  ? t("common.saved")
                  : t("common.saveFailed")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
