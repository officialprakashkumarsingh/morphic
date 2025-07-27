'use client'

import { useEffect,useState } from 'react'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
import { Award, BookOpen, Building, Calendar, Code,Download, ExternalLink, Eye, FileText, FileType, Globe, GraduationCap, Search, Star, User, Verified } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DocumentData {
  type: string
  query: string
  fileType: string
  category: string
  sortBy: string
  totalFound: number
  documents: Array<{
    id: string
    title: string
    url: string
    directLink: string
    fileType: string
    size: string
    source: string
    domain: string
    snippet: string
    publishDate: string
    author: string
    pages: number
    quality: string
    downloadCount: number
    tags: string[]
    verified: boolean
    previewUrl?: string
    thumbnailUrl?: string
    citation?: string
    journal?: string
    doi?: string
    abstract?: string
    agency?: string
    classification?: string
    version?: string
    language?: string
    course?: string
    level?: string
    university?: string
    preview?: {
      available: boolean
      text: string
      images: number
      tables: number
      charts: number
    }
  }>
  analysis: {
    summary: string
    metrics: {
      totalResults: number
      verifiedResults: number
      averageSize: string
      topSources: string[]
      categories: string[]
      newestDocument?: string
      oldestDocument?: string
    }
    recommendations: string[]
    qualityScore: number
  }
  sources: string[]
  timestamp: string
  status: string
}

interface DocumentSectionProps {
  tool: ToolInvocation
}

// Animated search progress component
const AnimatedSearchProgress = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const steps = [
    'Searching Google Scholar...',
    'Checking academic databases...',
    'Finding PDF direct links...',
    'Verifying document sources...',
    'Analyzing results...'
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length)
    }, 800)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="text-blue-600 animate-pulse">
      {steps[currentStep]}
    </div>
  )
}

export function DocumentSection({ tool }: DocumentSectionProps) {
  const [activeTab, setActiveTab] = useState('results')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchAnimation, setSearchAnimation] = useState(false)
  
  // Parse the result data
  let data: DocumentData | null = null
  let error: string | null = null

  try {
    if (tool.state === 'result' && (tool as any).result) {
      const resultData = typeof (tool as any).result === 'string' 
        ? JSON.parse((tool as any).result) 
        : (tool as any).result
      
      if (resultData.status === 'error') {
        error = resultData.error || 'Unknown error occurred'
      } else {
        data = resultData as DocumentData
      }
    }
  } catch (parseError) {
    console.error('Error parsing document data:', parseError)
    error = 'Failed to parse document data'
  }

  // Trigger search animation
  useEffect(() => {
    if (tool.state === 'call') {
      setSearchAnimation(true)
    } else {
      setSearchAnimation(false)
    }
  }, [tool.state])

  if (tool.state === 'call') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="relative">
            <Search className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <Search className="h-12 w-12 mx-auto text-blue-300 opacity-20" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-medium">Searching documents...</div>
            <div className="text-sm text-gray-500">
              <AnimatedSearchProgress />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Document Search Error</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No document data available</p>
      </div>
    )
  }

  // Filter documents by category
  const filteredDocuments = data.documents.filter(doc => {
    if (selectedCategory === 'all') return true
    return doc.source.toLowerCase().includes(selectedCategory.toLowerCase()) ||
           doc.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase()))
  })

  // Helper functions
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />
      case 'doc':
      case 'docx': return <FileText className="h-4 w-4 text-blue-500" />
      case 'ppt':
      case 'pptx': return <FileType className="h-4 w-4 text-orange-500" />
      case 'xls':
      case 'xlsx': return <FileType className="h-4 w-4 text-green-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('academic') || source.toLowerCase().includes('arxiv') || source.toLowerCase().includes('ieee')) {
      return <GraduationCap className="h-4 w-4 text-purple-500" />
    }
    if (source.toLowerCase().includes('government')) {
      return <Building className="h-4 w-4 text-green-500" />
    }
    if (source.toLowerCase().includes('technical')) {
      return <Code className="h-4 w-4 text-blue-500" />
    }
    if (source.toLowerCase().includes('educational')) {
      return <BookOpen className="h-4 w-4 text-orange-500" />
    }
    return <Globe className="h-4 w-4 text-gray-500" />
  }

  const getQualityColor = (quality: string, verified: boolean) => {
    if (!verified) return 'bg-gray-100 text-gray-800'
    switch (quality.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'good': return 'bg-yellow-100 text-yellow-800'
      case 'official': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }



  // Mobile-optimized document card
  const DocumentCard = ({ doc, index }: { doc: any; index: number }) => {
    const [isHovered, setIsHovered] = useState(false)

    return (
      <Card 
        key={doc.id}
        className={`transition-all duration-300 hover:shadow-md ${
          doc.verified ? 'border-green-200 bg-green-50/30' : 'bg-white'
        } border border-gray-200`}
        style={{ 
          animationDelay: `${index * 100}ms`,
          animation: 'slideInUp 0.5s ease-out forwards'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            {/* Header with icon and verification */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1 min-w-0">
                <div className="flex-shrink-0 pt-0.5">
                  {getFileTypeIcon(doc.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors leading-tight">
                    {doc.title}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                {doc.verified && (
                  <Verified className="h-4 w-4 text-green-500" />
                )}
                <Badge className={`text-xs ${getQualityColor(doc.quality, doc.verified)}`}>
                  {doc.quality}
                </Badge>
              </div>
            </div>
            
            {/* Snippet */}
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {doc.snippet}
            </p>
            
            {/* Metadata row - responsive layout */}
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 gap-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                {getSourceIcon(doc.source)}
                <span className="truncate">{doc.source}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{format(new Date(doc.publishDate), 'MMM yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1 col-span-2 sm:col-span-1">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{doc.author}</span>
              </div>
              <div className="flex items-center space-x-1 hidden sm:flex">
                <FileType className="h-3 w-3 flex-shrink-0" />
                <span>{doc.size} MB • {doc.pages} pages</span>
              </div>
            </div>
            
            {/* File size for mobile */}
            <div className="flex items-center space-x-1 text-xs text-gray-500 sm:hidden">
              <FileType className="h-3 w-3" />
              <span>{doc.size} MB • {doc.pages} pages</span>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {doc.tags.slice(0, 3).map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-50">
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-50">
                  +{doc.tags.length - 3}
                </Badge>
              )}
            </div>
            
            {/* Action buttons - responsive layout */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 pt-1">
              <div className="flex space-x-1 flex-1">
                {doc.preview?.available && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs flex-1 sm:flex-none"
                    onClick={() => window.open(doc.previewUrl, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs flex-1 sm:flex-none"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
              <Button
                size="sm"
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                onClick={() => window.open(doc.directLink, '_blank')}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
            
            {/* Additional metadata for academic papers */}
            {(doc.citation || doc.doi) && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs border">
                {doc.citation && (
                  <div className="mb-1">
                    <strong>Citation:</strong> {doc.citation}
                  </div>
                )}
                {doc.doi && (
                  <div>
                    <strong>DOI:</strong> {doc.doi}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
            {/* Search Header - Mobile Optimized */}
      <Card className="border border-gray-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold">Document Search</h1>
                <p className="text-sm sm:text-base text-gray-600 truncate">&quot;{data.query}&quot; • {data.fileType.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="text-center sm:text-right bg-blue-50 rounded-lg p-2 sm:bg-transparent sm:p-0">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{data.totalFound}</div>
              <div className="text-xs sm:text-sm text-gray-500">documents found</div>
            </div>
          </div>

          {/* Search metrics - Mobile Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Verified</p>
              <p className="text-sm sm:text-base font-semibold text-green-600">{data.analysis.metrics.verifiedResults}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Size</p>
              <p className="text-sm sm:text-base font-semibold">{data.analysis.metrics.averageSize}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Quality</p>
              <p className="text-sm sm:text-base font-semibold text-purple-600">{data.analysis.qualityScore}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Top Source</p>
              <p className="text-sm sm:text-base font-semibold truncate">{data.analysis.metrics.topSources[0]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter - Mobile Scrollable */}
      <div className="bg-gray-100 p-1 rounded-lg border">
        <div className="flex space-x-1 overflow-x-auto pb-1">
          {['all', 'academic', 'technical', 'government', 'educational'].map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap flex-shrink-0 capitalize text-xs sm:text-sm"
            >
              {category === 'all' ? 'All Sources' : category}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs - Mobile Friendly */}
      <div className="bg-gray-100 p-1 rounded-lg border">
        <div className="flex space-x-1">
          {['results', 'analysis', 'sources'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="flex-1 capitalize text-xs sm:text-sm"
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === 'results' && (
        <div className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="p-6 sm:p-8 text-center">
                <Search className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm sm:text-base text-gray-500">No documents found for the selected category</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 px-1">
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {filteredDocuments.length} of {data.totalFound} documents
                </p>
                <div className="text-xs text-gray-500">
                  Sorted by {data.sortBy}
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {filteredDocuments.map((doc, index) => (
                  <DocumentCard key={doc.id} doc={doc} index={index} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-4">
          {/* Search Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Search Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{data.analysis.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Search Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Results:</span>
                      <span className="font-medium">{data.analysis.metrics.totalResults}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verified Sources:</span>
                      <span className="font-medium">{data.analysis.metrics.verifiedResults}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average File Size:</span>
                      <span className="font-medium">{data.analysis.metrics.averageSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality Score:</span>
                      <span className="font-medium">{data.analysis.qualityScore}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Top Sources</h4>
                  <div className="space-y-2">
                    {data.analysis.metrics.topSources.map((source, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        {getSourceIcon(source)}
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.sources.map((source, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                    {getSourceIcon(source)}
                    <div>
                      <p className="font-medium">{source}</p>
                      <p className="text-xs text-gray-500">
                        {data.documents.filter(d => d.source === source).length} documents
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 text-center">
                 Last searched: {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm:ss')} • 
         Query: &quot;{data.query}&quot; • Category: {data.category} • 
         File type: {data.fileType.toUpperCase()}
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}