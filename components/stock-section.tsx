'use client'

import { useState } from 'react'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
// Using simple button-based tabs instead of missing tabs component
import { BarChart3, Calendar, DollarSign, ExternalLink,Globe, TrendingDown, TrendingUp, Volume2 } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StockData {
  type: 'stock'
  symbol: string
  quote: {
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    previousClose: number
    open: number
    high: number
    low: number
    volume: number
    marketCap?: number
    currency: string
    exchangeName: string
    marketState: string
    timezone: string
  }
  chart: Array<{
    date: string
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  news: Array<{
    title: string
    summary?: string
    link: string
    publisher: string
    publishedAt: string
  }>
  stats: {
    peRatio?: number
    pegRatio?: number
    priceToBook?: number
    dividendYield?: number
    eps?: number
    revenue?: number
    profitMargin?: number
    operatingMargin?: number
    returnOnEquity?: number
    debtToEquity?: number
    currentRatio?: number
    beta?: number
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
    averageVolume?: number
    sharesOutstanding?: number
  }
  comparison: Array<any>
  technicalIndicators: {
    sma20?: number
    sma50?: number
    sma200?: number
    rsi?: number
    macd?: any
    bollingerBands?: any
  }
  analysis: string
  period: string
  interval: string
  timestamp: string
  status: 'success' | 'error'
}

interface StockSectionProps {
  tool: ToolInvocation
}

export function StockSection({ tool }: StockSectionProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const data: StockData | undefined = (() => {
    try {
      if (tool.state === 'result') {
        const result = (tool as any).result
        if (result) {
          if (typeof result === 'string') {
            return JSON.parse(result)
          } else if (typeof result === 'object') {
            return result as StockData
          }
        }
      }
      return undefined
    } catch (error) {
      console.error('Failed to parse stock data:', error)
      return {
        type: 'stock',
        symbol: '',
        quote: {} as any,
        chart: [],
        news: [],
        stats: {},
        comparison: [],
        technicalIndicators: {},
        analysis: `Failed to parse stock data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        period: '1mo',
        interval: '1d',
        timestamp: new Date().toISOString(),
        status: 'error'
      } as StockData
    }
  })()

  if (tool.state === 'call') {
    return (
      <div className="bg-muted p-4 rounded-lg border animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">📈 Fetching Stock Data...</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Getting real-time market data, historical charts, and financial analysis...
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-muted p-4 rounded-lg border">
        <span className="text-sm text-muted-foreground">Stock data incomplete</span>
      </div>
    )
  }

  if (data.status === 'error') {
    return (
      <div className="bg-red-50 border-red-200 p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-600">❌</span>
          <span className="font-medium text-red-800">Stock Data Error</span>
        </div>
        <div className="text-sm text-red-700 whitespace-pre-wrap">
          {data.analysis}
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toFixed(0)
  }

  const isPositive = data.quote.change >= 0
  const chartData = data.chart.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd')
  }))

  return (
    <div className="space-y-6">
      {/* Stock Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {data.quote.name || data.symbol}
                <Badge variant="secondary">{data.symbol}</Badge>
              </CardTitle>
              <p className="text-muted-foreground">
                {data.quote.exchangeName} • {data.quote.marketState}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {formatCurrency(data.quote.price)}
              </div>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">
                  {formatCurrency(Math.abs(data.quote.change))} ({formatPercent(data.quote.changePercent)})
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="font-medium">{formatCurrency(data.quote.open)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High</p>
              <p className="font-medium">{formatCurrency(data.quote.high)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low</p>
              <p className="font-medium">{formatCurrency(data.quote.low)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume</p>
              <p className="font-medium">{formatNumber(data.quote.volume)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple button-based tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {['overview', 'chart', 'statistics', 'news'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="flex-1 capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Price Chart ({data.period})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Price']}
                      labelStyle={{ color: 'black' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke={isPositive ? '#16a34a' : '#dc2626'}
                      fill={isPositive ? '#16a34a20' : '#dc262620'}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.quote.marketCap && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Market Cap</span>
                  </div>
                  <p className="text-2xl font-bold">${formatNumber(data.quote.marketCap)}</p>
                </CardContent>
              </Card>
            )}
            
            {data.stats.peRatio && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  </div>
                  <p className="text-2xl font-bold">{data.stats.peRatio.toFixed(2)}</p>
                </CardContent>
              </Card>
            )}
            
            {data.stats.beta && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Beta</span>
                  </div>
                  <p className="text-2xl font-bold">{data.stats.beta.toFixed(2)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">
                {data.analysis}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="space-y-4">
          {/* Candlestick Chart */}
          <Card>
            <CardHeader>
              <CardTitle>OHLC Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      labelStyle={{ color: 'black' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="high" stroke="#16a34a" strokeWidth={1} dot={false} name="High" />
                    <Line type="monotone" dataKey="low" stroke="#dc2626" strokeWidth={1} dot={false} name="Low" />
                    <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} dot={false} name="Close" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatNumber(value), 'Volume']}
                      labelStyle={{ color: 'black' }}
                    />
                    <Bar dataKey="volume" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Financial Ratios */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Ratios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.stats.peRatio && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P/E Ratio</span>
                    <span className="font-medium">{data.stats.peRatio.toFixed(2)}</span>
                  </div>
                )}
                {data.stats.pegRatio && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PEG Ratio</span>
                    <span className="font-medium">{data.stats.pegRatio.toFixed(2)}</span>
                  </div>
                )}
                {data.stats.priceToBook && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price-to-Book</span>
                    <span className="font-medium">{data.stats.priceToBook.toFixed(2)}</span>
                  </div>
                )}
                {data.stats.dividendYield && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dividend Yield</span>
                    <span className="font-medium">{(data.stats.dividendYield * 100).toFixed(2)}%</span>
                  </div>
                )}
                {data.stats.eps && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EPS</span>
                    <span className="font-medium">{formatCurrency(data.stats.eps)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.technicalIndicators.sma20 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 20</span>
                    <span className="font-medium">{formatCurrency(data.technicalIndicators.sma20)}</span>
                  </div>
                )}
                {data.technicalIndicators.sma50 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 50</span>
                    <span className="font-medium">{formatCurrency(data.technicalIndicators.sma50)}</span>
                  </div>
                )}
                {data.technicalIndicators.sma200 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 200</span>
                    <span className="font-medium">{formatCurrency(data.technicalIndicators.sma200)}</span>
                  </div>
                )}
                {data.technicalIndicators.rsi && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className="font-medium">{data.technicalIndicators.rsi.toFixed(2)}</span>
                  </div>
                )}
                {data.stats.beta && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beta</span>
                    <span className="font-medium">{data.stats.beta.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 52-Week Range */}
            {data.stats.fiftyTwoWeekHigh && data.stats.fiftyTwoWeekLow && (
              <Card>
                <CardHeader>
                  <CardTitle>52-Week Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">52W High</span>
                    <span className="font-medium">{formatCurrency(data.stats.fiftyTwoWeekHigh)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">52W Low</span>
                    <span className="font-medium">{formatCurrency(data.stats.fiftyTwoWeekLow)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{
                        width: `${((data.quote.price - data.stats.fiftyTwoWeekLow!) / (data.stats.fiftyTwoWeekHigh! - data.stats.fiftyTwoWeekLow!)) * 100}%`
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-4">
          {data.news.length > 0 ? (
            <div className="space-y-4">
              {data.news.map((article, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium leading-tight">{article.title}</h3>
                      {article.summary && (
                        <p className="text-sm text-muted-foreground">{article.summary}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          <span>{article.publisher}</span>
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(article.publishedAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={article.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No recent news available for this stock.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        <span>Data updated: {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
      </div>
    </div>
  )
}