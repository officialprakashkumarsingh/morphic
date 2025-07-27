'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import { usePathname,useRouter } from 'next/navigation'

import { format } from 'date-fns'
import { 
  Edit, 
  MessageCircle, 
  MoreHorizontal, 
  Pin, 
  PinOff,
  Plus,
  Trash2} from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface Chat {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  messages: any[]
}

export function ChatHistory() {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const currentChatId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null

  useEffect(() => {
    loadChats()
  }, [])

  async function loadChats() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) throw error

      setChats(data || [])
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createNewChat() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          title: 'New Chat',
          messages: []
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/chat/${data.id}`)
      loadChats()
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  async function togglePin(chatId: string, isPinned: boolean) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('chats')
        .update({ is_pinned: !isPinned })
        .eq('id', chatId)

      if (error) throw error

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, is_pinned: !isPinned }
          : chat
      ))
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  async function renameChat(chatId: string, newTitle: string) {
    if (!newTitle.trim()) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle.trim() })
        .eq('id', chatId)

      if (error) throw error

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle.trim() }
          : chat
      ))
      
      setEditingId(null)
      setEditingTitle('')
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  async function deleteChat(chatId: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)

      if (error) throw error

      setChats(prev => prev.filter(chat => chat.id !== chatId))
      
      // If we're deleting the current chat, redirect to home
      if (currentChatId === chatId) {
        router.push('/')
      }
      
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  function startEditing(chat: Chat) {
    setEditingId(chat.id)
    setEditingTitle(chat.title)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingTitle('')
  }

  function handleKeyPress(e: React.KeyboardEvent, chatId: string) {
    if (e.key === 'Enter') {
      renameChat(chatId, editingTitle)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const pinnedChats = chats.filter(chat => chat.is_pinned)
  const regularChats = chats.filter(chat => !chat.is_pinned)

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-2 border-b">
        <Button 
          onClick={createNewChat}
          className="w-full justify-start text-left h-8"
          variant="ghost"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Pinned Chats */}
        {pinnedChats.length > 0 && (
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">Pinned</p>
            <div className="space-y-1">
              {pinnedChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editingTitle={editingTitle}
                  onEdit={startEditing}
                  onPin={togglePin}
                  onDelete={(id) => setDeleteId(id)}
                  onRename={renameChat}
                  onCancelEdit={cancelEditing}
                  onKeyPress={handleKeyPress}
                  setEditingTitle={setEditingTitle}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Chats */}
        {regularChats.length > 0 && (
          <div className="p-2">
            {pinnedChats.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2 px-2">Recent</p>
            )}
            <div className="space-y-1">
              {regularChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editingTitle={editingTitle}
                  onEdit={startEditing}
                  onPin={togglePin}
                  onDelete={(id) => setDeleteId(id)}
                  onRename={renameChat}
                  onCancelEdit={cancelEditing}
                  onKeyPress={handleKeyPress}
                  setEditingTitle={setEditingTitle}
                />
              ))}
            </div>
          </div>
        )}

        {chats.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs">Start a conversation to see your chat history</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteChat(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ChatItemProps {
  chat: Chat
  isActive: boolean
  isEditing: boolean
  editingTitle: string
  onEdit: (chat: Chat) => void
  onPin: (id: string, isPinned: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelEdit: () => void
  onKeyPress: (e: React.KeyboardEvent, chatId: string) => void
  setEditingTitle: (title: string) => void
}

function ChatItem({
  chat,
  isActive,
  isEditing,
  editingTitle,
  onEdit,
  onPin,
  onDelete,
  onRename,
  onCancelEdit,
  onKeyPress,
  setEditingTitle
}: ChatItemProps) {
  return (
    <div className={`group relative rounded-lg ${isActive ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
      {isEditing ? (
        <div className="p-2">
          <Input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, chat.id)}
            onBlur={() => onRename(chat.id, editingTitle)}
            className="h-6 text-sm"
            autoFocus
          />
        </div>
      ) : (
        <Link href={`/chat/${chat.id}`} className="block">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {chat.is_pinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{chat.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(chat.updated_at), 'MMM dd')}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(chat)}>
                  <Edit className="w-3 h-3 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPin(chat.id, chat.is_pinned)}>
                  {chat.is_pinned ? (
                    <>
                      <PinOff className="w-3 h-3 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-3 h-3 mr-2" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(chat.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Link>
      )}
    </div>
  )
}