import { tool } from 'ai'
import { z } from 'zod'

export function createStockTool() {
  return tool({
    description: `Get real-time stock market data and analysis with interactive charts.
    
    Use this tool when users want to:
    - Get current stock prices and market data
    - View historical stock performance
    - Analyze stock trends with interactive charts
    - Compare multiple stocks
    - Get detailed financial information
    - View market statistics and indicators
    
    This tool provides comprehensive stock analysis with visual charts.`,
    parameters: z.object({
      symbol: z.string().describe('Stock symbol (e.g., AAPL, GOOGL, MSFT, TSLA)'),
      period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).default('1mo').describe('Time period for historical data'),
      interval: z.enum(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']).default('1d').describe('Data interval'),
      includeNews: z.boolean().default(true).describe('Include recent news about the stock'),
      compare: z.array(z.string()).optional().describe('Additional stock symbols to compare (max 3)')
    }),
    execute: async ({ symbol, period, interval, includeNews, compare }) => {
      try {
        console.log(`Fetching stock data for ${symbol.toUpperCase()}`)
        
        // Clean and validate symbol
        const cleanSymbol = symbol.toUpperCase().trim()
        
        // Fetch multiple data sources in parallel
        const [quoteData, chartData, newsData, statsData] = await Promise.all([
          fetchQuoteData(cleanSymbol),
          fetchChartData(cleanSymbol, period, interval),
          includeNews ? fetchNewsData(cleanSymbol) : Promise.resolve([]),
          fetchStatsData(cleanSymbol)
        ])
        
        // Fetch comparison data if requested
        let comparisonData: any[] = []
        if (compare && compare.length > 0) {
          const compareSymbols = compare.slice(0, 3).map(s => s.toUpperCase().trim())
          comparisonData = await Promise.all(
            compareSymbols.map(s => fetchQuoteData(s))
          )
        }
        
        // Calculate technical indicators
        const technicalIndicators = calculateTechnicalIndicators(chartData)
        
        // Generate analysis
        const analysis = generateStockAnalysis(quoteData, chartData, technicalIndicators, newsData, statsData)
        
        const result = {
          type: 'stock',
          symbol: cleanSymbol,
          quote: quoteData,
          chart: chartData,
          news: newsData,
          stats: statsData,
          comparison: comparisonData,
          technicalIndicators,
          analysis,
          period,
          interval,
          timestamp: new Date().toISOString(),
          status: 'success'
        }
        
        return JSON.stringify(result)
        
      } catch (error) {
        console.error('Stock data fetch failed:', error)
        
        const errorResult = {
          type: 'stock',
          symbol: symbol.toUpperCase(),
          error: error instanceof Error ? error.message : 'Failed to fetch stock data',
          analysis: `❌ Stock data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Possible issues:\n• Invalid stock symbol\n• Market is closed\n• API rate limit reached\n• Network connection problem\n\n💡 Suggestions:\n• Check the stock symbol spelling\n• Try again in a few moments\n• Ensure the symbol is listed on major exchanges`,
          timestamp: new Date().toISOString(),
          status: 'error'
        }
        
        return JSON.stringify(errorResult)
      }
    }
  })
}

// Fetch current quote data with multiple fallback methods
async function fetchQuoteData(symbol: string) {
  const methods = [
    // Method 1: Yahoo Finance v8 API
    async () => {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`)
      if (!response.ok) throw new Error(`Yahoo v8 failed: ${response.status}`)
      const data = await response.json()
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data in response')
      }
      
      const result = data.chart.result[0]
      const meta = result.meta
      const quote = result.indicators.quote[0]
      const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1]
      const previousClose = meta.previousClose || meta.chartPreviousClose
      
      return {
        symbol,
        name: meta.longName || meta.shortName || symbol,
        price: currentPrice,
        change: currentPrice - previousClose,
        changePercent: ((currentPrice - previousClose) / previousClose) * 100,
        previousClose,
        open: meta.regularMarketOpen || quote.open[quote.open.length - 1],
        high: meta.regularMarketDayHigh || Math.max(...quote.high.filter((h: any) => h !== null)),
        low: meta.regularMarketDayLow || Math.min(...quote.low.filter((l: any) => l !== null)),
        volume: meta.regularMarketVolume || quote.volume[quote.volume.length - 1],
        marketCap: meta.marketCap,
        currency: meta.currency || 'USD',
        exchangeName: meta.exchangeName || 'Unknown',
        marketState: meta.marketState || 'UNKNOWN',
        timezone: meta.timezone || 'America/New_York'
      }
    },
    
    // Method 2: Alternative Yahoo endpoint
    async () => {
      const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`)
      if (!response.ok) throw new Error(`Yahoo v8 alt failed: ${response.status}`)
      const data = await response.json()
      const result = data.chart.result[0]
      const meta = result.meta
      
      return {
        symbol,
        name: meta.longName || meta.shortName || symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        previousClose: meta.previousClose,
        open: meta.regularMarketOpen,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume,
        marketCap: meta.marketCap,
        currency: meta.currency || 'USD',
        exchangeName: meta.exchangeName || 'Unknown',
        marketState: meta.marketState || 'UNKNOWN',
        timezone: meta.timezone || 'America/New_York'
      }
    },
    

  ]
  
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying method ${i + 1} for ${symbol}`)
      const result = await methods[i]()
      console.log(`Method ${i + 1} succeeded for ${symbol}`)
      return result
    } catch (error) {
      console.log(`Method ${i + 1} failed for ${symbol}:`, error)
      if (i === methods.length - 1) {
        throw new Error(`All methods failed for ${symbol}`)
      }
    }
  }
  
  throw new Error(`No methods available for ${symbol}`)
}

// Helper function to get company names
function getCompanyName(symbol: string): string {
  const names: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corporation',
    'TSLA': 'Tesla, Inc.',
    'AMZN': 'Amazon.com, Inc.',
    'META': 'Meta Platforms, Inc.',
    'NVDA': 'NVIDIA Corporation',
    'NFLX': 'Netflix, Inc.',
    'SPY': 'SPDR S&P 500 ETF Trust',
    'QQQ': 'Invesco QQQ Trust'
  }
  return names[symbol.toUpperCase()] || `${symbol.toUpperCase()} Corporation`
}

// Fetch historical chart data with fallbacks
async function fetchChartData(symbol: string, period: string, interval: string) {
  const methods = [
    // Method 1: Primary Yahoo Finance API
    async () => {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${period}&interval=${interval}`)
      if (!response.ok) throw new Error(`Primary chart API failed: ${response.status}`)
      const data = await response.json()
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No chart data in response')
      }
      
      const result = data.chart.result[0]
      const timestamps = result.timestamp || []
      const quote = result.indicators.quote[0] || {}
      
      if (timestamps.length === 0) {
        throw new Error('No timestamps in chart data')
      }
      
      const chartData = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString(),
        timestamp,
        open: quote.open?.[index] || 0,
        high: quote.high?.[index] || 0,
        low: quote.low?.[index] || 0,
        close: quote.close?.[index] || 0,
        volume: quote.volume?.[index] || 0
      })).filter((item: any) => item.close !== null && item.close !== 0)
      
      return chartData
    },
    
    // Method 2: Alternative endpoint
    async () => {
      const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=${period}&interval=${interval}`)
      if (!response.ok) throw new Error(`Alt chart API failed: ${response.status}`)
      const data = await response.json()
      const result = data.chart.result[0]
      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]
      
      return timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString(),
        timestamp,
        open: quote.open[index],
        high: quote.high[index],
        low: quote.low[index],
        close: quote.close[index],
        volume: quote.volume[index]
      })).filter((item: any) => item.close !== null)
    },
    

  ]
  
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying chart method ${i + 1} for ${symbol}`)
      const result = await methods[i]()
      console.log(`Chart method ${i + 1} succeeded for ${symbol}`)
      return result
    } catch (error) {
      console.log(`Chart method ${i + 1} failed for ${symbol}:`, error)
      if (i === methods.length - 1) {
        throw error
      }
    }
  }
  
  throw new Error(`All chart methods failed for ${symbol}`)
}

// Fetch recent news with fallback
async function fetchNewsData(symbol: string) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=1&newsCount=5`)
    
    if (!response.ok) {
      throw new Error('News API failed')
    }
    
    const data = await response.json()
    return data.news?.map((item: any) => ({
      title: item.title,
      summary: item.summary,
      link: item.link,
      publisher: item.publisher,
      publishedAt: new Date(item.providerPublishTime * 1000).toISOString()
    })) || []
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return []
  }
}

// Fetch detailed statistics with fallback
async function fetchStatsData(symbol: string) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,financialData,defaultKeyStatistics`)
    
    if (!response.ok) {
      throw new Error('Stats API failed')
    }
    
    const data = await response.json()
    const summaryDetail = data.quoteSummary?.result?.[0]?.summaryDetail || {}
    const financialData = data.quoteSummary?.result?.[0]?.financialData || {}
    const keyStats = data.quoteSummary?.result?.[0]?.defaultKeyStatistics || {}
    
    return {
      peRatio: summaryDetail.trailingPE?.raw,
      pegRatio: summaryDetail.pegRatio?.raw,
      priceToBook: summaryDetail.priceToBook?.raw,
      dividendYield: summaryDetail.dividendYield?.raw,
      eps: financialData.trailingEps?.raw,
      revenue: financialData.totalRevenue?.raw,
      profitMargin: financialData.profitMargins?.raw,
      operatingMargin: financialData.operatingMargins?.raw,
      returnOnEquity: financialData.returnOnEquity?.raw,
      debtToEquity: financialData.debtToEquity?.raw,
      currentRatio: financialData.currentRatio?.raw,
      beta: keyStats.beta?.raw,
      fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh?.raw,
      fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow?.raw,
      averageVolume: summaryDetail.averageVolume?.raw,
      sharesOutstanding: keyStats.sharesOutstanding?.raw
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return {}
  }
}

// Calculate technical indicators
function calculateTechnicalIndicators(chartData: any[]) {
  if (!chartData || chartData.length < 20) {
    return {}
  }
  
  const closes = chartData.map(d => d.close).filter(c => c !== null)
  
  // Simple Moving Averages
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  const sma200 = calculateSMA(closes, 200)
  
  // RSI
  const rsi = calculateRSI(closes, 14)
  
  // MACD
  const macd = calculateMACD(closes)
  
  // Bollinger Bands
  const bollingerBands = calculateBollingerBands(closes, 20, 2)
  
  return {
    sma20: sma20[sma20.length - 1],
    sma50: sma50[sma50.length - 1],
    sma200: sma200[sma200.length - 1],
    rsi: rsi[rsi.length - 1],
    macd,
    bollingerBands: {
      upper: bollingerBands.upper[bollingerBands.upper.length - 1],
      middle: bollingerBands.middle[bollingerBands.middle.length - 1],
      lower: bollingerBands.lower[bollingerBands.lower.length - 1]
    }
  }
}

// Helper functions for technical analysis
function calculateSMA(data: number[], period: number): number[] {
  const result = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const average = slice.reduce((sum, val) => sum + val, 0) / period
    result.push(average)
  }
  return result
}

function calculateRSI(closes: number[], period: number): number[] {
  const rsi = []
  const gains = []
  const losses = []
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period
    const rs = avgGain / (avgLoss || 1)
    rsi.push(100 - (100 / (1 + rs)))
  }
  
  return rsi
}

function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const macdLine = ema12.map((val, i) => val - ema26[i])
  const signalLine = calculateEMA(macdLine, 9)
  const histogram = macdLine.map((val, i) => val - signalLine[i])
  
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1]
  }
}

function calculateEMA(data: number[], period: number): number[] {
  const multiplier = 2 / (period + 1)
  const ema = [data[0]]
  
  for (let i = 1; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1])
  }
  
  return ema
}

function calculateBollingerBands(data: number[], period: number, multiplier: number) {
  const sma = calculateSMA(data, period)
  const upper = []
  const middle = []
  const lower = []
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const mean = sma[i - period + 1]
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    
    middle.push(mean)
    upper.push(mean + (stdDev * multiplier))
    lower.push(mean - (stdDev * multiplier))
  }
  
  return { upper, middle, lower }
}

// Generate comprehensive analysis
function generateStockAnalysis(quote: any, chartData: any[], indicators: any, news: any[], stats: any): string {
  let analysis = `📈 Stock Analysis: ${quote.name} (${quote.symbol})\n\n`
  
  // Current Price Analysis
  analysis += `💰 Current Price: $${quote.price.toFixed(2)} ${quote.currency}\n`
  analysis += `📊 Change: ${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)\n`
  analysis += `📈 Day Range: $${quote.low.toFixed(2)} - $${quote.high.toFixed(2)}\n`
  analysis += `📦 Volume: ${formatNumber(quote.volume)}\n`
  if (quote.marketCap) analysis += `🏢 Market Cap: $${formatNumber(quote.marketCap)}\n`
  analysis += `🏛️ Exchange: ${quote.exchangeName} (${quote.marketState})\n\n`
  
  // Technical Analysis
  if (indicators.sma20) {
    analysis += `🔍 Technical Indicators:\n`
    analysis += `• SMA 20: $${indicators.sma20.toFixed(2)}\n`
    if (indicators.sma50) analysis += `• SMA 50: $${indicators.sma50.toFixed(2)}\n`
    if (indicators.sma200) analysis += `• SMA 200: $${indicators.sma200.toFixed(2)}\n`
    if (indicators.rsi) analysis += `• RSI (14): ${indicators.rsi.toFixed(2)} ${getRSISignal(indicators.rsi)}\n`
    if (indicators.macd) {
      analysis += `• MACD: ${indicators.macd.macd.toFixed(4)} ${getMACDSignal(indicators.macd)}\n`
    }
    analysis += `\n`
  }
  
  // Fundamental Analysis
  if (Object.keys(stats).length > 0) {
    analysis += `📊 Key Statistics:\n`
    if (stats.peRatio) analysis += `• P/E Ratio: ${stats.peRatio.toFixed(2)}\n`
    if (stats.pegRatio) analysis += `• PEG Ratio: ${stats.pegRatio.toFixed(2)}\n`
    if (stats.priceToBook) analysis += `• Price-to-Book: ${stats.priceToBook.toFixed(2)}\n`
    if (stats.dividendYield) analysis += `• Dividend Yield: ${(stats.dividendYield * 100).toFixed(2)}%\n`
    if (stats.eps) analysis += `• EPS: $${stats.eps.toFixed(2)}\n`
    if (stats.beta) analysis += `• Beta: ${stats.beta.toFixed(2)} ${getBetaSignal(stats.beta)}\n`
    if (stats.fiftyTwoWeekHigh && stats.fiftyTwoWeekLow) {
      analysis += `• 52W Range: $${stats.fiftyTwoWeekLow.toFixed(2)} - $${stats.fiftyTwoWeekHigh.toFixed(2)}\n`
    }
    analysis += `\n`
  }
  
  // Price Movement Analysis
  const priceChange = quote.changePercent
  analysis += `📈 Price Movement Analysis:\n`
  if (priceChange > 5) analysis += `🚀 Strong upward momentum (+${priceChange.toFixed(2)}%)\n`
  else if (priceChange > 2) analysis += `📈 Positive movement (+${priceChange.toFixed(2)}%)\n`
  else if (priceChange > -2) analysis += `➡️ Relatively stable (${priceChange.toFixed(2)}%)\n`
  else if (priceChange > -5) analysis += `📉 Negative movement (${priceChange.toFixed(2)}%)\n`
  else analysis += `🔻 Significant decline (${priceChange.toFixed(2)}%)\n`
  
  // Volume Analysis
  if (stats.averageVolume && quote.volume) {
    const volumeRatio = quote.volume / stats.averageVolume
    if (volumeRatio > 2) analysis += `🔊 High volume activity (${volumeRatio.toFixed(1)}x average)\n`
    else if (volumeRatio > 1.5) analysis += `📢 Above average volume (${volumeRatio.toFixed(1)}x average)\n`
    else if (volumeRatio < 0.5) analysis += `🔇 Low volume activity (${volumeRatio.toFixed(1)}x average)\n`
    else analysis += `📊 Normal volume activity (${volumeRatio.toFixed(1)}x average)\n`
  }
  analysis += `\n`
  
  // News Summary
  if (news.length > 0) {
    analysis += `📰 Recent News (${news.length} articles):\n`
    news.slice(0, 3).forEach((article, index) => {
      analysis += `${index + 1}. ${article.title}\n`
      if (article.summary) analysis += `   ${article.summary.substring(0, 100)}...\n`
    })
    analysis += `\n`
  }
  
  analysis += `💡 Interactive charts and detailed analysis available below.`
  
  return analysis
}

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toFixed(0)
}

function getRSISignal(rsi: number): string {
  if (rsi > 70) return '(Overbought)'
  if (rsi < 30) return '(Oversold)'
  return '(Neutral)'
}

function getMACDSignal(macd: any): string {
  if (macd.macd > macd.signal) return '(Bullish)'
  if (macd.macd < macd.signal) return '(Bearish)'
  return '(Neutral)'
}

function getBetaSignal(beta: number): string {
  if (beta > 1.5) return '(High volatility)'
  if (beta > 1) return '(More volatile than market)'
  if (beta < 0.5) return '(Low volatility)'
  return '(Similar to market)'
}

export const stockTool = createStockTool()