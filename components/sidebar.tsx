"use client"

import type { Conversation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Trash2,
  Plus,
  Settings,
  Pencil,
  Check,
  X,
  MoreHorizontal,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/lib/i18n-context"

interface SidebarProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (conversation: Conversation) => void
  onDelete: (id: string) => void
  onNew: () => void
  showSettings: boolean
  onSettingsClick: () => void
  onUpdateTitle?: (id: string, title: string) => void
}

export function Sidebar({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNew,
  showSettings,
  onSettingsClick,
  onUpdateTitle,
}: SidebarProps) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t("common.today")
    if (diffDays === 1) return t("common.yesterday")
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo")}`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div
        className={cn(
          "h-screen bg-muted/30 border-r border-border/40 flex flex-col shrink-0 overflow-hidden transition-all duration-300",
          collapsed ? "w-16" : "w-72",
        )}
      >
        {/* Hamburger Menu */}
        <div className="p-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <Button
            onClick={onNew}
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10", !collapsed && "w-full justify-start gap-2")}
          >
            <Plus className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t("common.newChat")}</span>}
          </Button>
        </div>

        {/* Conversations List */}
        {!collapsed && (
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 pb-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group",
                    currentId === conv.id && !showSettings ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                  onClick={() => !editingId && onSelect(conv)}
                >
                  {editingId === conv.id ? (
                      <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation()
                              if (editingId && editingTitle.trim()) {
                                onUpdateTitle?.(editingId, editingTitle.trim())
                              }
                              setEditingId(null)
                              setEditingTitle("")
                            }
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setEditingTitle("")
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (editingId && editingTitle.trim()) {
                              onUpdateTitle?.(editingId, editingTitle.trim())
                            }
                            setEditingId(null)
                            setEditingTitle("")
                          }}
                        >
                          <Check className="h-3 w-3 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(null)
                            setEditingTitle("")
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-sm truncate">{conv.title || t("common.newChat")}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(conv.updatedAt)}</p>
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  setEditingId(conv.id)
                                  setEditingTitle(conv.title)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("common.rename")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  setDeleteConfirmId(conv.id)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </>
                    )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Spacer for collapsed state */}
        {collapsed && <div className="flex-1" />}

        {/* Settings Button */}
        <div className="p-3 border-t border-border/30 shrink-0">
          <Button
            onClick={onSettingsClick}
            variant={showSettings ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2", collapsed && "justify-center px-2")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>{t("common.settings")}</span>}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sidebar.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sidebar.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
