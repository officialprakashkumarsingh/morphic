'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import type { Chat } from '@/lib/types'

export async function getChats(userId?: string | null) {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching chats:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting chats:', error)
    return []
  }
}

export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  const user = await getCurrentUser()
  if (!user) {
    return { chats: [], nextOffset: null }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching chat page:', error)
      return { chats: [], nextOffset: null }
    }

    const chats = (data || []).map(chat => ({
      id: chat.id,
      title: chat.title,
      userId: chat.user_id,
      createdAt: new Date(chat.created_at),
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      path: `/search/${chat.id}`,
      sharePath: chat.share_path || undefined
    }))

    const nextOffset = data && data.length === limit ? offset + limit : null
    return { chats, nextOffset }
  } catch (error) {
    console.error('Error fetching chat page:', error)
    return { chats: [], nextOffset: null }
  }
}

export async function getChat(id: string, userId: string = 'anonymous') {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return null
    }

    // Convert messages from JSON string back to object if needed
    const messages = typeof data.messages === 'string' 
      ? JSON.parse(data.messages) 
      : data.messages || []

    return {
      id: data.id,
      title: data.title,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      messages,
      path: `/search/${data.id}`,
      sharePath: data.share_path || undefined
    }
  } catch (error) {
    console.error(`Error getting chat ${id}:`, error)
    return null
  }
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error(`Error deleting chat ${id}:`, error)
      return { error: 'Failed to delete chat' }
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error(`Error deleting chat ${id}:`, error)
    return { error: 'Failed to delete chat' }
  }
}

export async function clearChats() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing chats:', error)
      return { error: 'Failed to clear chats' }
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error clearing chats:', error)
    return { error: 'Failed to clear chats' }
  }
}

export async function saveChat(chat: Chat, userId: string = 'anonymous') {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
    
    // Generate title from last user message if not provided
    let title = chat.title || 'New Chat'
    if (chat.messages && chat.messages.length > 0) {
      // Find the last user message
      const lastUserMessage = [...chat.messages]
        .reverse()
        .find(msg => msg.role === 'user')
      
      if (lastUserMessage && typeof lastUserMessage.content === 'string') {
        title = lastUserMessage.content.slice(0, 100) // Limit to 100 characters
      }
    }

    const chatData = {
      id: chat.id,
      user_id: user.id,
      title,
      messages: chat.messages || [],
      share_path: chat.sharePath || null,
      created_at: chat.createdAt || new Date(),
      updated_at: new Date()
    }

    const { data, error } = await supabase
      .from('chats')
      .upsert(chatData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error saving chat:', error)
      throw new Error('Failed to save chat')
    }

    return data
  } catch (error) {
    console.error('Error saving chat:', error)
    throw error
  }
}

export async function getSharedChat(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .not('share_path', 'is', null)
      .single()

    if (error || !data) {
      return null
    }

    // Convert messages from JSON if needed
    const messages = typeof data.messages === 'string' 
      ? JSON.parse(data.messages) 
      : data.messages || []

         return {
       id: data.id,
       title: data.title,
       userId: data.user_id,
       createdAt: new Date(data.created_at),
       messages,
       path: `/search/${data.id}`,
       sharePath: data.share_path
     }
  } catch (error) {
    console.error(`Error getting shared chat ${id}:`, error)
    return null
  }
}

export async function shareChat(id: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
    
    // Get the chat first
    const { data: chat, error: getError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (getError || !chat) {
      return { error: 'Chat not found' }
    }

    // Update with share path
    const sharePath = `/share/${id}`
    const { error: updateError } = await supabase
      .from('chats')
      .update({ share_path: sharePath })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error sharing chat:', updateError)
      return { error: 'Failed to share chat' }
    }

    return { sharePath }
  } catch (error) {
    console.error(`Error sharing chat ${id}:`, error)
    return { error: 'Failed to share chat' }
  }
}
