"use client"

import type { Conversation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Trash2, Plus, Globe, ChevronLeft, ChevronRight, Settings, Pencil, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
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
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div
        className={cn(
          "h-screen border-r border-border/50 bg-muted/30 flex flex-col shrink-0 overflow-hidden",
          collapsed ? "w-16" : "w-72",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="font-semibold">i want a name</span>
            </div>
          )}
          {collapsed && <Globe className="h-5 w-5 text-primary mx-auto" />}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 shrink-0", collapsed && "mx-auto mt-2")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <Button
            onClick={onNew}
            variant="outline"
            className={cn("w-full justify-start gap-2", collapsed && "justify-center px-2")}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Chat</span>}
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  currentId === conv.id && !showSettings ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  collapsed && "justify-center",
                )}
                onClick={() => !editingId && onSelect(conv)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={collapsed ? conv.title : undefined}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
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
                        <div className="flex-1 min-w-0 pr-14">
                          <p className="text-sm truncate">{conv.title || "New Conversation"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(conv.updatedAt)}</p>
                        </div>
                        <div
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 transition-opacity bg-inherit",
                            hoveredId === conv.id ? "opacity-100" : "opacity-0 pointer-events-none",
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-muted hover:bg-muted-foreground/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(conv.id)
                              setEditingTitle(conv.title)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-muted hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(conv.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Settings Button */}
        <div className="p-3 border-t border-border/50 shrink-0">
          <Button
            onClick={onSettingsClick}
            variant={showSettings ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2", collapsed && "justify-center px-2")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
