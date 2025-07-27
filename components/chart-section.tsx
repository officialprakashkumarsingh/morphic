'use client'

import React, { useState } from 'react'

import { ToolInvocation } from 'ai'
import { AreaChart as AreaChartIcon,BarChart3, Download, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react'
import { 
  Area,
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Line, 
  LineChart, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis} from 'recharts'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Collapsible, CollapsibleContent } from './ui/collapsible'
import { Tooltip as TooltipComponent, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Section } from './section'
import { ToolBadge } from './tool-badge'

interface ChartSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (value: boolean) => void
}

interface ChartResult {
  type: 'chart' | 'error'
  title?: string
  data?: any[]
  chartType?: 'bar' | 'line' | 'pie' | 'area'
  xKey?: string
  yKey?: string
  dataKeys?: string[]
  colors?: string[]
  error?: string
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347']

export function ChartSection({ tool, isOpen, onOpenChange }: ChartSectionProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar')

  const data: ChartResult | undefined =
    tool.state === 'result' && tool.result ? JSON.parse(tool.result) : undefined

  const downloadChart = () => {
    // Create SVG element for download
    const svgElement = document.querySelector('.recharts-wrapper svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      const link = document.createElement('a')
      link.download = `${data?.title || 'chart'}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const renderChart = (type: 'bar' | 'line' | 'pie' | 'area') => {
    if (!data?.data) return null

    const chartData = data.data
    const xKey = data.xKey || Object.keys(chartData[0] || {})[0]
    const dataKeys = data.dataKeys || Object.keys(chartData[0] || {}).filter(key => key !== xKey)

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={data.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={data.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stackId="1"
                  stroke={data.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  fill={data.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
        const pieData = dataKeys.length === 1 
          ? chartData.map(item => ({ name: item[xKey], value: item[dataKeys[0]] }))
          : dataKeys.map((key, index) => ({
              name: key,
              value: chartData.reduce((sum, item) => sum + (item[key] || 0), 0)
            }))

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={data.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleContent>
        <div className={cn('border rounded-lg overflow-hidden')}>
          <div className="p-3 bg-muted/30 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ToolBadge tool="chart">
                {data?.type === 'error' ? 'Error' : 'Chart'}
              </ToolBadge>
            </div>
          </div>

          <div className="p-4">
            {data?.type === 'error' ? (
              <Section title="Chart Generation Failed">
                <div className="text-red-600 text-sm">
                  {data.error || 'Failed to generate chart'}
                </div>
              </Section>
            ) : data?.data ? (
              <>
                <Section title={data?.title || 'Generated Chart'}>
                  <div className="space-y-4">
                    {/* Chart Type Selector */}
                    <div className="flex gap-2 mb-4">
                      <TooltipComponent>
                        <TooltipTrigger asChild>
                          <Button
                            variant={chartType === 'bar' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChartType('bar')}
                          >
                            <BarChart3 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bar Chart</TooltipContent>
                      </TooltipComponent>

                      <TooltipComponent>
                        <TooltipTrigger asChild>
                          <Button
                            variant={chartType === 'line' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChartType('line')}
                          >
                            <LineChartIcon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Line Chart</TooltipContent>
                      </TooltipComponent>

                      <TooltipComponent>
                        <TooltipTrigger asChild>
                          <Button
                            variant={chartType === 'area' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChartType('area')}
                          >
                            <AreaChartIcon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Area Chart</TooltipContent>
                      </TooltipComponent>

                      <TooltipComponent>
                        <TooltipTrigger asChild>
                          <Button
                            variant={chartType === 'pie' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChartType('pie')}
                          >
                            <PieChartIcon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Pie Chart</TooltipContent>
                      </TooltipComponent>

                      <div className="ml-auto">
                        <TooltipComponent>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadChart}
                            >
                              <Download className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download Chart</TooltipContent>
                        </TooltipComponent>
                      </div>
                    </div>

                    {/* Chart Display */}
                    <div className="w-full border rounded-lg p-4 bg-background">
                      {renderChart(chartType)}
                    </div>

                    {/* Data Summary */}
                    {data.data && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Data Summary</h4>
                        <p className="text-xs text-muted-foreground">
                          {data.data.length} data points • {Object.keys(data.data[0] || {}).length} fields
                        </p>
                      </div>
                    )}
                  </div>
                </Section>
              </>
            ) : (
              <Section title="Chart">
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                </div>
              </Section>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}