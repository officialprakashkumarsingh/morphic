'use client'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
import { 
  Activity,
  BarChart3, 
  Brain,
  Calendar,
  Clock, 
  MessageCircle, 
  Pin, 
  Target,
  TrendingUp,
  User, 
  Zap} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserKnowledgeSectionProps {
  tool: ToolInvocation
}

export function UserKnowledgeSection({ tool }: UserKnowledgeSectionProps) {
  if (tool.state === 'call') {
    return (
      <div className="bg-muted p-3 rounded-lg border animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-sm">🧠 Analyzing Your Knowledge...</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Gathering your activity patterns, chat history, and usage analytics...
        </p>
      </div>
    )
  }

  if (tool.state === 'partial-call') {
    return (
      <div className="bg-muted p-3 rounded-lg border">
        <span className="text-xs text-muted-foreground">Preparing user analytics...</span>
      </div>
    )
  }

  if (tool.state === 'result') {
    const result = tool.result

    if (!result?.success || !result?.data) {
      return (
        <div className="bg-red-50 border-red-200 p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-800 text-sm">Analytics Error</span>
          </div>
          <div className="text-xs text-red-700">
            {result?.error || 'Failed to load user analytics'}
          </div>
        </div>
      )
    }

    const data = result.data
    const { user, overview, productivity, patterns, recentActivity, insights } = data

    const getEngagementColor = (level: string) => {
      switch (level) {
        case 'Very High': return 'bg-purple-100 text-purple-800'
        case 'High': return 'bg-green-100 text-green-800'
        case 'Medium': return 'bg-blue-100 text-blue-800'
        case 'Low': return 'bg-yellow-100 text-yellow-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    return (
      <div className="space-y-3">
        {/* User Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-blue-600" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Age:</span>
                <span>{user.accountAge}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Engagement:</span>
                <Badge className={`text-xs ${getEngagementColor(overview.engagement.level)}`}>
                  {overview.engagement.description}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Chats</p>
                  <p className="text-sm font-bold">{overview.totalChats}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Messages</p>
                  <p className="text-sm font-bold">{overview.totalMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pinned</p>
                  <p className="text-sm font-bold">{overview.pinnedChats}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Tools Used</p>
                  <p className="text-sm font-bold">{overview.totalToolsUsed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Productivity Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Productivity Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chats/Day:</span>
                  <span className="font-medium">{productivity.chatsPerDay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Messages/Day:</span>
                  <span className="font-medium">{productivity.messagesPerDay}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg/Chat:</span>
                  <span className="font-medium">{overview.averageMessagesPerChat}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Day:</span>
                  <span className="font-medium">{productivity.mostActiveDay}</span>
                </div>
              </div>
            </div>
            
            {productivity.longestChat && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-blue-600" />
                  <span className="font-medium text-blue-800">Longest Chat</span>
                </div>
                <p className="text-blue-700 leading-relaxed">
                  &quot;{productivity.longestChat.title}&quot; ({productivity.longestChat.messageCount} messages)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Patterns */}
        {patterns && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-indigo-600" />
                Activity Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {/* Time preference */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Preferred Time:</p>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {productivity.preferredTimeSlot}
                  </Badge>
                </div>

                {/* Favorite tools */}
                {patterns.favoriteTools && patterns.favoriteTools.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Favorite Tools:</p>
                    <div className="flex flex-wrap gap-1">
                      {patterns.favoriteTools.slice(0, 3).map((tool: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly activity */}
                {Object.keys(patterns.activityByDay).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Weekly Activity:</p>
                    <div className="grid grid-cols-7 gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const fullDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day)]
                        const count = patterns.activityByDay[fullDay] || 0
                        const maxCount = Math.max(...Object.values(patterns.activityByDay) as number[])
                        const intensity = maxCount > 0 ? count / maxCount : 0
                        
                        return (
                          <div key={day} className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">{day}</div>
                            <div 
                              className="h-6 w-full rounded bg-blue-100 flex items-center justify-center text-xs font-medium"
                              style={{ 
                                backgroundColor: intensity > 0 
                                  ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
                                  : '#f1f5f9',
                                color: intensity > 0.5 ? 'white' : '#64748b'
                              }}
                            >
                              {count}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentActivity && recentActivity.recentChats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Recent Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {recentActivity.recentChats.slice(0, 3).map((chat: any, index: number) => (
                  <div key={index} className="p-2 border rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium truncate max-w-[120px]">{chat.title}</span>
                        {chat.isPinned && <Pin className="w-3 h-3 text-blue-500" />}
                      </div>
                      <span className="text-muted-foreground">
                        {chat.messageCount} msgs
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(chat.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights & Recommendations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-violet-600" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              <div className="p-2 bg-violet-50 rounded">
                <p className="text-xs text-violet-800 leading-relaxed">
                  {insights.topInsight}
                </p>
              </div>
              
              {insights.recommendations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Recommendations:</p>
                  <div className="space-y-1">
                    {insights.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center">
          Generated: {format(new Date(data.generatedAt), 'MMM dd, HH:mm')} • 
          Range: {data.timeRange === 'all' ? 'All time' : data.timeRange}
        </div>
      </div>
    )
  }

  return null
}