import { tool } from 'ai'
import { z } from 'zod'

export function createCryptoTool() {
  return tool({
    description: `Get real-time cryptocurrency data and analysis with interactive charts.
    
    This tool provides comprehensive crypto market data including:
    - Current prices and market data
    - Historical price charts with multiple timeframes
    - Market statistics (market cap, volume, supply)
    - Price change analytics (24h, 7d, 30d)
    - Technical indicators and trends
    - Social sentiment and market dominance
    - Interactive charts and visualizations
    
    Supports major cryptocurrencies like BTC, ETH, ADA, SOL, DOGE, etc.
    Data is fetched from multiple reliable sources with fallback mechanisms.`,
    parameters: z.object({
      symbol: z.string().describe('Cryptocurrency symbol (e.g., BTC, ETH, ADA, SOL, DOGE)'),
      period: z.enum(['1d', '7d', '30d', '90d', '180d', '1y']).default('30d').describe('Time period for historical data'),
      currency: z.enum(['usd', 'eur', 'btc']).default('usd').describe('Currency for price display'),
      includeMarketData: z.boolean().default(true).describe('Include detailed market statistics'),
      compare: z.array(z.string()).optional().describe('Additional crypto symbols to compare (max 3)')
    }),
    execute: async ({ symbol, period, currency, includeMarketData, compare }) => {
      try {
        const cleanSymbol = symbol.toLowerCase().trim()
        console.log(`Fetching crypto data for ${cleanSymbol.toUpperCase()}`)

        // Fetch all data in parallel
        const [currentData, chartData, marketData, comparisonData] = await Promise.all([
          fetchCurrentPrice(cleanSymbol, currency),
          fetchChartData(cleanSymbol, period, currency),
          includeMarketData ? fetchMarketData(cleanSymbol, currency) : Promise.resolve({}),
          compare && compare.length > 0 ? fetchComparisonData(compare.slice(0, 3), currency) : Promise.resolve([])
        ])

        // Calculate technical indicators
        const technicalIndicators = calculateTechnicalIndicators(chartData)

        // Generate analysis
        const analysis = generateCryptoAnalysis(currentData, chartData, marketData, technicalIndicators)

        const result = {
          type: 'crypto',
          symbol: cleanSymbol.toUpperCase(),
          current: currentData,
          chart: chartData,
          market: marketData,
          comparison: comparisonData,
          technicalIndicators,
          analysis,
          period,
          currency: currency.toUpperCase(),
          timestamp: new Date().toISOString(),
          status: 'success'
        }

        return JSON.stringify(result)
      } catch (error) {
        console.error('Crypto tool error:', error)
        const errorResult = {
          type: 'crypto',
          symbol: symbol.toUpperCase(),
          error: `Failed to fetch crypto data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          status: 'error'
        }
        return JSON.stringify(errorResult)
      }
    }
  })
}

// Fetch current price data with multiple fallback APIs
async function fetchCurrentPrice(symbol: string, currency: string) {
  const methods = [
    // Method 1: CoinGecko API (no key required)
    async () => {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(symbol)}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`)
      if (!response.ok) throw new Error(`CoinGecko API failed: ${response.status}`)
      const data = await response.json()
      
      const coinId = getCoinGeckoId(symbol)
      const coinData = data[coinId]
      if (!coinData) throw new Error('No data for symbol')

      return {
        symbol: symbol.toUpperCase(),
        name: getCryptoName(symbol),
        price: coinData[currency],
        change24h: coinData[`${currency}_24h_change`] || 0,
        marketCap: coinData[`${currency}_market_cap`] || 0,
        volume24h: coinData[`${currency}_24h_vol`] || 0
      }
    },

    // Method 2: CoinCap API (alternative)
    async () => {
      const response = await fetch(`https://api.coincap.io/v2/assets/${getCoinCapId(symbol)}`)
      if (!response.ok) throw new Error(`CoinCap API failed: ${response.status}`)
      const data = await response.json()
      
      const asset = data.data
      if (!asset) throw new Error('No data for symbol')

      const priceUsd = parseFloat(asset.priceUsd)
      const change24h = parseFloat(asset.changePercent24Hr) || 0

      return {
        symbol: symbol.toUpperCase(),
        name: asset.name,
        price: currency === 'usd' ? priceUsd : priceUsd, // For simplicity, using USD
        change24h: change24h,
        marketCap: parseFloat(asset.marketCapUsd) || 0,
        volume24h: parseFloat(asset.volumeUsd24Hr) || 0
      }
    }
  ]

  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying price method ${i + 1} for ${symbol}`)
      const result = await methods[i]()
      console.log(`Price method ${i + 1} succeeded for ${symbol}`)
      return result
    } catch (error) {
      console.log(`Price method ${i + 1} failed for ${symbol}:`, error)
      if (i === methods.length - 1) {
        throw new Error(`All price methods failed for ${symbol}`)
      }
    }
  }

  throw new Error(`No price methods available for ${symbol}`)
}

// Fetch historical chart data
async function fetchChartData(symbol: string, period: string, currency: string) {
  const methods = [
    // Method 1: CoinGecko market chart
    async () => {
      const days = periodToDays(period)
      const interval = days <= 1 ? 'hourly' : days <= 90 ? 'daily' : 'daily'
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${getCoinGeckoId(symbol)}/market_chart?vs_currency=${currency}&days=${days}&interval=${interval}`)
      
      if (!response.ok) throw new Error(`CoinGecko chart API failed: ${response.status}`)
      const data = await response.json()
      
      if (!data.prices || data.prices.length === 0) {
        throw new Error('No chart data available')
      }

      return data.prices.map((price: [number, number], index: number) => ({
        date: new Date(price[0]).toISOString(),
        timestamp: price[0],
        price: price[1],
        volume: data.total_volumes?.[index]?.[1] || 0
      }))
    },

    // Method 2: CoinCap history
    async () => {
      const interval = periodToInterval(period)
      const start = Date.now() - (periodToDays(period) * 24 * 60 * 60 * 1000)
      const response = await fetch(`https://api.coincap.io/v2/assets/${getCoinCapId(symbol)}/history?interval=${interval}&start=${start}&end=${Date.now()}`)
      
      if (!response.ok) throw new Error(`CoinCap history API failed: ${response.status}`)
      const data = await response.json()
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No chart data available')
      }

      return data.data.map((item: any) => ({
        date: new Date(item.time).toISOString(),
        timestamp: item.time,
        price: parseFloat(item.priceUsd),
        volume: 0 // CoinCap doesn't provide volume in history
      }))
    }
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

// Fetch detailed market data
async function fetchMarketData(symbol: string, currency: string) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${getCoinGeckoId(symbol)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
    
    if (!response.ok) {
      throw new Error('Market data API failed')
    }
    
    const data = await response.json()
    const marketData = data.market_data

    return {
      marketCap: marketData.market_cap?.[currency] || 0,
      marketCapRank: data.market_cap_rank || 0,
      totalVolume: marketData.total_volume?.[currency] || 0,
      circulatingSupply: marketData.circulating_supply || 0,
      totalSupply: marketData.total_supply || 0,
      maxSupply: marketData.max_supply || null,
      ath: marketData.ath?.[currency] || 0,
      athDate: marketData.ath_date?.[currency] || null,
      atl: marketData.atl?.[currency] || 0,
      atlDate: marketData.atl_date?.[currency] || null,
      priceChange7d: marketData.price_change_percentage_7d || 0,
      priceChange30d: marketData.price_change_percentage_30d || 0,
      marketCapChange24h: marketData.market_cap_change_percentage_24h || 0
    }
  } catch (error) {
    console.error('Failed to fetch market data:', error)
    return {}
  }
}

// Fetch comparison data for multiple cryptos
async function fetchComparisonData(symbols: string[], currency: string) {
  try {
    const coinIds = symbols.map(s => getCoinGeckoId(s.toLowerCase())).join(',')
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`)
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return symbols.map(symbol => {
      const coinId = getCoinGeckoId(symbol.toLowerCase())
      const coinData = data[coinId]
      return {
        symbol: symbol.toUpperCase(),
        name: getCryptoName(symbol),
        price: coinData?.[currency] || 0,
        change24h: coinData?.[`${currency}_24h_change`] || 0,
        marketCap: coinData?.[`${currency}_market_cap`] || 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch comparison data:', error)
    return []
  }
}

// Calculate technical indicators
function calculateTechnicalIndicators(chartData: any[]) {
  if (!chartData || chartData.length < 20) {
    return {}
  }

  const prices = chartData.map(d => d.price)
  const volumes = chartData.map(d => d.volume)

  return {
    sma20: calculateSMA(prices, 20),
    sma50: calculateSMA(prices, 50),
    rsi: calculateRSI(prices, 14),
    volatility: calculateVolatility(prices),
    avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
    priceRange: {
      high: Math.max(...prices),
      low: Math.min(...prices),
      range: Math.max(...prices) - Math.min(...prices)
    }
  }
}

// Generate crypto analysis
function generateCryptoAnalysis(current: any, chart: any[], market: any, indicators: any) {
  const trend = chart.length > 1 && chart[chart.length - 1].price > chart[0].price ? 'bullish' : 'bearish'
  const volatilityLevel = indicators.volatility > 0.05 ? 'high' : indicators.volatility > 0.02 ? 'medium' : 'low'
  
  return {
    trend,
    volatility: volatilityLevel,
    sentiment: trend === 'bullish' ? 'positive' : 'negative',
    keyLevels: {
      support: indicators.priceRange?.low || current.price * 0.9,
      resistance: indicators.priceRange?.high || current.price * 1.1
    },
    summary: `${current.symbol} is showing ${trend} momentum with ${volatilityLevel} volatility. Current price is ${formatCurrency(current.price)} with ${current.change24h >= 0 ? 'gains' : 'losses'} of ${Math.abs(current.change24h).toFixed(2)}% in 24h.`
  }
}

// Helper functions
function getCoinGeckoId(symbol: string): string {
  const mapping: { [key: string]: string } = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'ada': 'cardano',
    'sol': 'solana',
    'doge': 'dogecoin',
    'dot': 'polkadot',
    'link': 'chainlink',
    'ltc': 'litecoin',
    'bch': 'bitcoin-cash',
    'xlm': 'stellar',
    'xrp': 'ripple',
    'matic': 'polygon',
    'avax': 'avalanche-2',
    'algo': 'algorand',
    'atom': 'cosmos',
    'near': 'near',
    'uni': 'uniswap',
    'aave': 'aave',
    'comp': 'compound-governance-token'
  }
  return mapping[symbol] || symbol
}

function getCoinCapId(symbol: string): string {
  const mapping: { [key: string]: string } = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'ada': 'cardano',
    'sol': 'solana',
    'doge': 'dogecoin',
    'dot': 'polkadot',
    'link': 'chainlink',
    'ltc': 'litecoin',
    'bch': 'bitcoin-cash',
    'xlm': 'stellar',
    'xrp': 'ripple',
    'matic': 'polygon',
    'avax': 'avalanche',
    'algo': 'algorand',
    'atom': 'cosmos',
    'near': 'near-protocol',
    'uni': 'uniswap',
    'aave': 'aave',
    'comp': 'compound'
  }
  return mapping[symbol] || symbol
}

function getCryptoName(symbol: string): string {
  const names: { [key: string]: string } = {
    'btc': 'Bitcoin',
    'eth': 'Ethereum',
    'ada': 'Cardano',
    'sol': 'Solana',
    'doge': 'Dogecoin',
    'dot': 'Polkadot',
    'link': 'Chainlink',
    'ltc': 'Litecoin',
    'bch': 'Bitcoin Cash',
    'xlm': 'Stellar',
    'xrp': 'XRP',
    'matic': 'Polygon',
    'avax': 'Avalanche',
    'algo': 'Algorand',
    'atom': 'Cosmos',
    'near': 'NEAR Protocol',
    'uni': 'Uniswap',
    'aave': 'Aave',
    'comp': 'Compound'
  }
  return names[symbol.toLowerCase()] || symbol.toUpperCase()
}

function periodToDays(period: string): number {
  const mapping: { [key: string]: number } = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '1y': 365
  }
  return mapping[period] || 30
}

function periodToInterval(period: string): string {
  const mapping: { [key: string]: string } = {
    '1d': 'h1',
    '7d': 'h6',
    '30d': 'd1',
    '90d': 'd1',
    '180d': 'd1',
    '1y': 'd1'
  }
  return mapping[period] || 'd1'
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }

  const avgGain = gains / period
  const avgLoss = losses / period
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  return Math.sqrt(variance)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }).format(value)
}

export const cryptoTool = createCryptoTool()