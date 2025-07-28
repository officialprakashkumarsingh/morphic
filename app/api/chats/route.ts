import { NextRequest, NextResponse } from 'next/server'

import { getChatsPage } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { type Chat } from '@/lib/types'

interface ChatPageResponse {
  chats: Chat[]
  nextOffset: number | null
}

export async function GET(request: NextRequest) {
  // Chat history is disabled - return empty response
  return NextResponse.json<ChatPageResponse>({ chats: [], nextOffset: null })
}
