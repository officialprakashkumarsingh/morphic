import { NextRequest, NextResponse } from 'next/server'

import { removeChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Chat history is disabled - return success
  return NextResponse.json({ ok: true })
}
