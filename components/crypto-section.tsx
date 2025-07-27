'use client'

import { useState } from 'react'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
import { BarChart3, Bitcoin, Calendar, Coins, DollarSign, TrendingDown, TrendingUp, Volume2 } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CryptoData {
  type: string
  symbol: string
  current: {
    symbol: string
    name: string
    price: number
    change24h: number
    marketCap: number
    volume24h: number
  }
  chart: Array<{
    date: string
    timestamp: number
    price: number
    volume: number
  }>
  market: {
    marketCap: number
    marketCapRank: number
    totalVolume: number
    circulatingSupply: number
    totalSupply: number
    maxSupply: number | null
    ath: number
    athDate: string | null
    atl: number
    atlDate: string | null
    priceChange7d: number
    priceChange30d: number
    marketCapChange24h: number
  }
  comparison: Array<{
    symbol: string
    name: string
    price: number
    change24h: number
    marketCap: number
  }>
  technicalIndicators: {
    sma20: number
    sma50: number
    rsi: number
    volatility: number
    avgVolume: number
    priceRange: {
      high: number
      low: number
      range: number
    }
  }
  analysis: {
    trend: string
    volatility: string
    sentiment: string
    keyLevels: {
      support: number
      resistance: number
    }
    summary: string
  }
  period: string
  currency: string
  timestamp: string
  status: string
}

interface CryptoSectionProps {
  tool: ToolInvocation
}

export function CryptoSection({ tool }: CryptoSectionProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Parse the result data
  let data: CryptoData | null = null
  let error: string | null = null

  try {
    if (tool.state === 'result' && (tool as any).result) {
      const resultData = typeof (tool as any).result === 'string' 
        ? JSON.parse((tool as any).result) 
        : (tool as any).result
      
      if (resultData.status === 'error') {
        error = resultData.error || 'Unknown error occurred'
      } else {
        data = resultData as CryptoData
      }
    }
  } catch (parseError) {
    console.error('Error parsing crypto data:', parseError)
    error = 'Failed to parse crypto data'
  }

  if (tool.state === 'call') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Bitcoin className="h-4 w-4 animate-pulse text-orange-500" />
          <span className="text-sm">Fetching crypto data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Crypto Data Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-gray-500">No crypto data available</p>
      </div>
    )
  }

  // Helper functions
  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(8)}`
    } else if (price < 1) {
      return `$${price.toFixed(6)}`
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
    return `$${num.toFixed(2)}`
  }

  const formatSupply = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
  }

  const getTrendColor = (trend: string) => {
    return trend === 'bullish' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      {/* Crypto Header - Compact Mobile Design */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                <Bitcoin className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{data.current.name}</h1>
                <p className="text-xs text-gray-600">{data.current.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{formatPrice(data.current.price)}</div>
              <div className={`flex items-center space-x-1 text-xs ${getChangeColor(data.current.change24h)}`}>
                {getChangeIcon(data.current.change24h)}
                <span className="font-medium">
                  {data.current.change24h >= 0 ? '+' : ''}{data.current.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-600">Market Cap</p>
              <p className="font-semibold">{formatLargeNumber(data.current.marketCap)}</p>
            </div>
            <div>
              <p className="text-gray-600">24h Volume</p>
              <p className="font-semibold">{formatLargeNumber(data.current.volume24h)}</p>
            </div>
            <div>
              <p className="text-gray-600">Rank</p>
              <p className="font-semibold">#{data.market.marketCapRank || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Supply</p>
              <p className="font-semibold">{formatSupply(data.market.circulatingSupply || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact button-based tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['overview', 'chart', 'market', 'analysis'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="flex-1 capitalize text-xs py-1 h-7"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Compact Price Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Price ({data.period})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart}>
                    <XAxis 
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(timestamp) => format(new Date(timestamp), 'MM/dd')}
                      fontSize={10}
                    />
                    <YAxis 
                      domain={['dataMin - dataMin * 0.1', 'dataMax + dataMax * 0.1']}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      fontSize={10}
                    />
                    <Tooltip 
                      labelFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
                      formatter={(value: number) => [formatPrice(value), 'Price']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#f97316" 
                      fill="#f97316" 
                      fillOpacity={0.1}
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Compact Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">7d Change</p>
                    <p className={`text-sm font-semibold ${getChangeColor(data.market.priceChange7d || 0)}`}>
                      {data.market.priceChange7d >= 0 ? '+' : ''}{data.market.priceChange7d?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">30d Change</p>
                    <p className={`text-sm font-semibold ${getChangeColor(data.market.priceChange30d || 0)}`}>
                      {data.market.priceChange30d >= 0 ? '+' : ''}{data.market.priceChange30d?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Volatility</p>
                    <Badge className={`${getVolatilityColor(data.analysis.volatility)} text-xs`}>
                      {data.analysis.volatility}
                    </Badge>
                  </div>
                  <Volume2 className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compact Analysis Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-start space-x-2 mb-2">
                <Badge className={`${getTrendColor(data.analysis.trend)} text-xs`}>
                  {data.analysis.trend}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {data.analysis.sentiment}
                </Badge>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{data.analysis.summary}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="space-y-3">
          {/* Price Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Price Movement</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(timestamp) => format(new Date(timestamp), 'MM/dd')}
                      fontSize={10}
                    />
                    <YAxis 
                      domain={['dataMin - dataMin * 0.1', 'dataMax + dataMax * 0.1']}
                      tickFormatter={(value) => formatPrice(value)}
                      fontSize={10}
                    />
                    <Tooltip 
                      labelFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
                      formatter={(value: number) => [formatPrice(value), 'Price']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#f97316" 
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Chart */}
          {data.chart.some(d => d.volume > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Volume</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(timestamp) => format(new Date(timestamp), 'MM/dd')}
                        fontSize={10}
                      />
                      <YAxis tickFormatter={(value) => formatLargeNumber(value)} fontSize={10} />
                      <Tooltip 
                        labelFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
                        formatter={(value: number) => [formatLargeNumber(value), 'Volume']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="volume" fill="#f97316" opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-3">
          {/* Market Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Market Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Cap</span>
                  <span className="font-medium">{formatLargeNumber(data.market.marketCap || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume</span>
                  <span className="font-medium">{formatLargeNumber(data.market.totalVolume || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Circulating</span>
                  <span className="font-medium">{formatSupply(data.market.circulatingSupply || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Supply</span>
                  <span className="font-medium">{formatSupply(data.market.totalSupply || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">All-Time High</span>
                  <span className="font-medium">{formatPrice(data.market.ath || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">All-Time Low</span>
                  <span className="font-medium">{formatPrice(data.market.atl || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison */}
          {data.comparison && data.comparison.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Similar Assets</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  {data.comparison.slice(0, 3).map((crypto, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                      <div className="flex items-center space-x-2">
                        <Coins className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="font-medium">{crypto.name}</p>
                          <p className="text-gray-600">{crypto.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(crypto.price)}</p>
                        <p className={`${getChangeColor(crypto.change24h)}`}>
                          {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-3">
          {/* Technical Indicators */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Technical Indicators</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">SMA 20</span>
                  <span className="font-medium">{formatPrice(data.technicalIndicators.sma20 || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SMA 50</span>
                  <span className="font-medium">{formatPrice(data.technicalIndicators.sma50 || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RSI (14)</span>
                  <span className="font-medium">{data.technicalIndicators.rsi?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Support</span>
                  <span className="font-medium">{formatPrice(data.analysis.keyLevels.support)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resistance</span>
                  <span className="font-medium">{formatPrice(data.analysis.keyLevels.resistance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Price Range ({data.period})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">High</span>
                  <span className="font-medium">{formatPrice(data.technicalIndicators.priceRange?.high || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Low</span>
                  <span className="font-medium">{formatPrice(data.technicalIndicators.priceRange?.low || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Range</span>
                  <span className="font-medium">{formatPrice(data.technicalIndicators.priceRange?.range || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compact Metadata */}
      <div className="text-xs text-gray-500 text-center">
        Updated: {format(new Date(data.timestamp), 'MMM dd, HH:mm')} • {data.period} • {data.currency}
      </div>
    </div>
  )
}