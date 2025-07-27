import { tool } from 'ai'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export function createUserKnowledgeTool() {
  return tool({
    description: `Get comprehensive user analytics, knowledge, and insights including chat history, tool usage, activity patterns, and personalized statistics. 
    This tool provides a complete overview of the user's interaction with the AI assistant, helping to understand usage patterns, preferences, and productivity metrics.`,
    parameters: z.object({
      includeDetails: z.boolean().optional().describe('Include detailed breakdown of activity (default: true)'),
      timeRange: z.enum(['7d', '30d', '90d', 'all']).optional().describe('Time range for analytics (default: all)'),
      includeChats: z.boolean().optional().describe('Include recent chat summaries (default: true)')
    }),
    execute: async ({ includeDetails = true, timeRange = 'all', includeChats = true }) => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          return {
            success: false,
            error: 'User not authenticated',
            data: null
          }
        }

        const supabase = await createClient()
        
        // Calculate time filter
        let timeFilter = new Date(0) // Beginning of time
        if (timeRange !== 'all') {
          const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
          timeFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Get user analytics
        const { data: analytics } = await supabase
          .from('user_analytics')
          .select('*')
          .eq('user_id', user.id)
          .single()

        // Get chat statistics
        const { data: chats, count: totalChats } = await supabase
          .from('chats')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', timeFilter.toISOString())
          .order('created_at', { ascending: false })

        // Get pinned chats count
        const { count: pinnedChats } = await supabase
          .from('chats')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_pinned', true)

        // Calculate activity patterns
        const activityByDay = chats?.reduce((acc: Record<string, number>, chat) => {
          const day = new Date(chat.created_at).toLocaleDateString('en-US', { weekday: 'long' })
          acc[day] = (acc[day] || 0) + 1
          return acc
        }, {}) || {}

        const activityByHour = chats?.reduce((acc: Record<string, number>, chat) => {
          const hour = new Date(chat.created_at).getHours()
          const timeSlot = hour < 6 ? 'Night (12-6 AM)' 
                         : hour < 12 ? 'Morning (6 AM-12 PM)'
                         : hour < 18 ? 'Afternoon (12-6 PM)'
                         : 'Evening (6 PM-12 AM)'
          acc[timeSlot] = (acc[timeSlot] || 0) + 1
          return acc
        }, {}) || {}

        // Calculate message statistics
        let totalMessages = 0
        let averageMessagesPerChat = 0
        let longestChat = { title: '', messageCount: 0 }

        if (chats && chats.length > 0) {
          chats.forEach(chat => {
            const messageCount = Array.isArray(chat.messages) ? chat.messages.length : 0
            totalMessages += messageCount
            if (messageCount > longestChat.messageCount) {
              longestChat = { title: chat.title, messageCount }
            }
          })
          averageMessagesPerChat = Math.round(totalMessages / chats.length)
        }

        // Get recent chat summaries
        let recentChats: any[] = []
        if (includeChats && chats) {
          recentChats = chats.slice(0, 5).map(chat => ({
            title: chat.title,
            createdAt: chat.created_at,
            messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
            isPinned: chat.is_pinned,
            lastMessage: Array.isArray(chat.messages) && chat.messages.length > 0 
              ? chat.messages[chat.messages.length - 1]?.content?.slice(0, 100) + '...'
              : 'No messages'
          }))
        }

        // Get productivity insights
        const accountAge = Math.floor((Date.now() - new Date(profile?.created_at || user.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const chatsPerDay = accountAge > 0 ? Math.round((totalChats || 0) / accountAge * 10) / 10 : 0
        const messagesPerDay = accountAge > 0 ? Math.round(totalMessages / accountAge * 10) / 10 : 0

        // Determine user engagement level
        const getEngagementLevel = () => {
          if (chatsPerDay >= 3) return { level: 'Very High', description: 'Power User 🚀' }
          if (chatsPerDay >= 1.5) return { level: 'High', description: 'Active User 🔥' }
          if (chatsPerDay >= 0.5) return { level: 'Medium', description: 'Regular User 📈' }
          if (chatsPerDay > 0) return { level: 'Low', description: 'Casual User 🌱' }
          return { level: 'New', description: 'Getting Started 👋' }
        }

        const engagement = getEngagementLevel()

        // Get tool usage statistics
        const toolStats = analytics?.usage_stats || {}
        const favoriteTools = analytics?.favorite_tools || []

        const result = {
          success: true,
          error: null,
          data: {
            user: {
              id: user.id,
              name: profile?.name || user.user_metadata?.name || 'Unknown',
              email: user.email,
              joinedAt: profile?.created_at || user.created_at,
              accountAge: `${accountAge} days`,
              lastActive: analytics?.last_active || 'Unknown'
            },
            overview: {
              totalChats: totalChats || 0,
              totalMessages: totalMessages,
              pinnedChats: pinnedChats || 0,
              totalToolsUsed: analytics?.total_tools_used || 0,
              averageMessagesPerChat,
              engagement
            },
            productivity: {
              chatsPerDay,
              messagesPerDay,
              longestChat: longestChat.messageCount > 0 ? longestChat : null,
              mostActiveDay: Object.entries(activityByDay).reduce((a, b) => a[1] > b[1] ? a : b, ['None', 0])[0],
              preferredTimeSlot: Object.entries(activityByHour).reduce((a, b) => a[1] > b[1] ? a : b, ['Unknown', 0])[0]
            },
            patterns: includeDetails ? {
              activityByDay,
              activityByHour,
              toolUsage: toolStats,
              favoriteTools
            } : null,
            recentActivity: includeChats ? {
              recentChats,
              summary: `${recentChats.length} recent chats in the last ${timeRange}`
            } : null,
            insights: {
              topInsight: totalChats === 0 
                ? "Welcome to AhamAI! Start your first conversation to begin building your knowledge base." 
                : totalChats < 5 
                ? "You're getting started! Try exploring different tools to enhance your productivity."
                : averageMessagesPerChat > 10
                ? "You have deep conversations! Your chats tend to be comprehensive and detailed."
                : "You're an efficient communicator! You get straight to the point in your interactions.",
              recommendations: [
                totalChats > 10 && pinnedChats === 0 ? "Consider pinning important chats for quick access" : null,
                averageMessagesPerChat < 3 ? "Try asking follow-up questions to get more detailed responses" : null,
                (analytics?.total_tools_used || 0) < 5 ? "Explore more tools like stock analysis, crypto tracking, and diagrams" : null,
                chatsPerDay < 0.5 && accountAge > 7 ? "Regular usage can help you get more value from your AI assistant" : null
              ].filter(Boolean)
            },
            timeRange,
            generatedAt: new Date().toISOString()
          }
        }

        return result
      } catch (error) {
        console.error('User knowledge tool error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve user analytics',
          data: null
        }
      }
    }
  })
}