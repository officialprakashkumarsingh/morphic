'use client'

import { useEffect, useRef, useState } from 'react'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
import { 
  Clock, 
  Compass, 
  Gauge, 
  MapPin, 
  Plane, 
  PlaneLanding, 
  PlaneTakeoff, 
  Users, 
  Volume2, 
  VolumeX,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FlightData {
  type: string
  flightNumber: string
  date: string
  status: {
    flightNumber: string
    airline: string
    airlineCode: string
    status: string
    progress: number
    departure: {
      code: string
      name: string
      city: string
      country: string
      timezone: string
      coordinates: { lat: number; lon: number }
      scheduledTime: string
      estimatedTime: string
      actualTime?: string | null
      gate: string
      terminal: number
    }
    arrival: {
      code: string
      name: string
      city: string
      country: string
      timezone: string
      coordinates: { lat: number; lon: number }
      scheduledTime: string
      estimatedTime: string
      actualTime?: string | null
      gate: string
      terminal: number
    }
    aircraft: {
      currentPosition: { lat: number; lon: number }
      altitude: number
      speed: number
      heading: number
      registration: string
      type: string
    }
    delay: number
    distance: number
    duration: number
    live: boolean
  }
  route: {
    departure: any
    arrival: any
    distance: number
    duration: number
  }
  aircraft: {
    type: string
    registration: string
    airline: string
    manufacturer: string
    model: string
    capacity: number
    speed: number
    range: number
  }
  analysis: {
    summary: string
    status: string
    onTime: boolean
    progress: number
    phase: string
  }
  timestamp: string
  status_code: string
}

interface FlightSectionProps {
  tool: ToolInvocation
}

export function FlightSection({ tool }: FlightSectionProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Parse the result data
  let data: FlightData | null = null
  let error: string | null = null

  try {
    if (tool.state === 'result' && (tool as any).result) {
      const resultData = typeof (tool as any).result === 'string' 
        ? JSON.parse((tool as any).result) 
        : (tool as any).result
      
      if (resultData.status_code === 'error') {
        error = resultData.error || 'Unknown error occurred'
      } else {
        data = resultData as FlightData
      }
    }
  } catch (parseError) {
    console.error('Error parsing flight data:', parseError)
    error = 'Failed to parse flight data'
  }

  // Create airplane sound effect
  useEffect(() => {
    if (typeof window === 'undefined' || !soundEnabled || !data?.status?.live) {
      setIsPlaying(false)
      return
    }

    let audioContext: AudioContext | null = null
    let oscillator1: OscillatorNode | null = null
    let oscillator2: OscillatorNode | null = null
    let gainNode: GainNode | null = null

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      oscillator1 = audioContext.createOscillator()
      oscillator2 = audioContext.createOscillator()
      gainNode = audioContext.createGain()
      const filter = audioContext.createBiquadFilter()
      
      // Configure low frequency rumble (engine)
      oscillator1.frequency.setValueAtTime(80, audioContext.currentTime)
      oscillator1.type = 'sawtooth'
      
      // Configure higher frequency hum (air)
      oscillator2.frequency.setValueAtTime(200, audioContext.currentTime)
      oscillator2.type = 'sine'
      
      // Configure filter for realistic sound
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, audioContext.currentTime)
      
      // Configure volume
      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime)
      
      // Connect audio graph
      oscillator1.connect(filter)
      oscillator2.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Start oscillators
      oscillator1.start()
      oscillator2.start()
      setIsPlaying(true)
      
    } catch (error) {
      console.log('Web Audio API error:', error)
      setIsPlaying(false)
    }

    return () => {
      try {
        if (oscillator1) {
          oscillator1.stop()
          oscillator1.disconnect()
        }
        if (oscillator2) {
          oscillator2.stop()
          oscillator2.disconnect()
        }
        if (gainNode) {
          gainNode.disconnect()
        }
        if (audioContext) {
          audioContext.close()
        }
        setIsPlaying(false)
      } catch (error) {
        console.log('Audio cleanup error:', error)
      }
    }
  }, [soundEnabled, data?.status?.live])

  if (tool.state === 'call') {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Plane className="h-6 w-6 text-blue-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-sm font-medium">Tracking flight...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 mx-2 sm:mx-0">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <Plane className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 truncate">Flight Tracking Error</h3>
              <p className="mt-1 text-xs text-red-600 break-words">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500 text-sm">No flight data available</p>
      </div>
    )
  }

  // Helper functions
  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm')
  }

  const formatDate = (isoString: string) => {
    return format(new Date(isoString), 'MMM dd')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time': 
      case 'scheduled': return 'bg-green-500 text-white'
      case 'delayed': return 'bg-red-500 text-white'
      case 'active': 
      case 'in flight': return 'bg-blue-500 text-white'
      case 'landed': return 'bg-gray-500 text-white'
      case 'boarding': return 'bg-yellow-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusIcon = (status: string, phase: string) => {
    switch (phase) {
      case 'takeoff': return <PlaneTakeoff className="h-4 w-4" />
      case 'approach': return <PlaneLanding className="h-4 w-4" />
      case 'cruise': return <Plane className="h-4 w-4" />
      default: return <Plane className="h-4 w-4" />
    }
  }

  const getDelayText = (delay: number) => {
    if (delay === 0) return 'On Time'
    if (delay > 0) return `+${delay}m`
    return `${delay}m`
  }

  const getDelayColor = (delay: number) => {
    if (delay === 0) return 'text-green-600'
    if (delay > 0) return 'text-red-600'
    return 'text-blue-600'
  }

  // Enhanced animated airplane component
  const AnimatedAirplane = ({ progress, isLive }: { progress: number, isLive: boolean }) => {
    const [animatedProgress, setAnimatedProgress] = useState(progress)
    const [altitude, setAltitude] = useState(0)
    
    useEffect(() => {
      if (isLive) {
        const interval = setInterval(() => {
          setAnimatedProgress(prev => {
            const newProgress = Math.min(prev + 0.2, 100)
            // Simulate altitude changes during flight
            if (newProgress < 10) setAltitude(newProgress * 500) // Takeoff
            else if (newProgress > 90) setAltitude((100 - newProgress) * 500) // Landing
            else setAltitude(35000 + Math.sin(newProgress / 10) * 2000) // Cruise with slight variations
            return newProgress
          })
        }, 2000)
        return () => clearInterval(interval)
      } else {
        setAnimatedProgress(progress)
      }
    }, [isLive, progress])

    return (
      <div className="relative w-full h-6 bg-gray-100 rounded-full overflow-hidden">
        {/* Flight path trail */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-200 transition-all duration-2000 ease-out"
          style={{ width: `${animatedProgress}%` }}
        />
        
        {/* Sky gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 opacity-50" />
        
        {/* Animated airplane with realistic movement */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-2000 ease-out"
          style={{ 
            left: `${Math.max(animatedProgress - 2, 0)}%`,
            transform: `translateY(-50%) ${isLive ? `translateY(${Math.sin(Date.now() / 1000) * 2}px) rotate(${Math.sin(Date.now() / 2000) * 3}deg)` : ''}`
          }}
        >
          <div className={`text-blue-600 transition-transform duration-300 ${isLive ? 'animate-pulse' : ''}`}>
            {data?.analysis?.phase === 'takeoff' && (
              <PlaneTakeoff className={`h-5 w-5 ${isLive ? 'animate-bounce' : ''}`} />
            )}
            {data?.analysis?.phase === 'approach' && (
              <PlaneLanding className={`h-5 w-5 ${isLive ? 'animate-bounce' : ''}`} />
            )}
            {(data?.analysis?.phase === 'cruise' || !data?.analysis?.phase) && (
              <Plane className={`h-5 w-5 ${isLive ? 'animate-pulse' : ''}`} />
            )}
          </div>
          
          {/* Contrail effect for live flights */}
          {isLive && animatedProgress > 20 && (
            <div 
              className="absolute top-1/2 right-full h-0.5 bg-white opacity-60 animate-pulse"
              style={{ width: `${Math.min(animatedProgress * 2, 100)}px` }}
            />
          )}
        </div>
        
        {/* Departure marker */}
        <div className="absolute top-1/2 left-1 transform -translate-y-1/2">
          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        </div>
        
        {/* Arrival marker */}
        <div className="absolute top-1/2 right-1 transform -translate-y-1/2">
          <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
        </div>
        
        {/* Altitude indicator for live flights */}
        {isLive && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-mono">
            {Math.round(altitude).toLocaleString()}ft
          </div>
        )}
      </div>
    )
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  return (
    <div className="space-y-3 p-2 sm:p-0">
      {/* Compact Flight Header */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-blue-200">
                {getStatusIcon(data.status.status, data.analysis.phase)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold truncate">{data.status.flightNumber}</h1>
                <p className="text-xs text-gray-600 truncate">{data.status.airline}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Sound Control for Live Flights */}
              {data.status.live && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8 p-0"
                  title={soundEnabled ? 'Disable sound' : 'Enable sound'}
                >
                  {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                </Button>
              )}
              
              <div className="text-right">
                <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(data.status.status)}`}>
                  {data.status.status}
                </Badge>
                <div className={`text-xs font-medium mt-0.5 ${getDelayColor(data.status.delay)}`}>
                  {getDelayText(data.status.delay)}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Flight Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col items-center min-w-0">
                <span className="font-bold text-green-600">{data.status.departure.code}</span>
                <span className="text-gray-500 truncate w-full text-center">{data.status.departure.city}</span>
              </div>
              
              <div className="flex-1 mx-3">
                <div className="text-center mb-1">
                  <span className="text-xs font-medium text-blue-600">{data.status.progress}%</span>
                  {data.status.live && (
                    <span className="ml-1 text-xs text-green-500 animate-pulse">● LIVE</span>
                  )}
                </div>
                <AnimatedAirplane progress={data.status.progress} isLive={data.status.live} />
              </div>
              
              <div className="flex flex-col items-center min-w-0">
                <span className="font-bold text-red-600">{data.status.arrival.code}</span>
                <span className="text-gray-500 truncate w-full text-center">{data.status.arrival.city}</span>
              </div>
            </div>
          </div>

          {/* Compact Flight Info Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Departure</p>
              <p className="font-semibold text-sm">{formatTime(data.status.departure.scheduledTime)}</p>
              <p className="text-xs text-gray-500">Gate {data.status.departure.gate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Arrival</p>
              <p className="font-semibold text-sm">{formatTime(data.status.arrival.scheduledTime)}</p>
              <p className="text-xs text-gray-500">Gate {data.status.arrival.gate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['overview', 'route', 'aircraft', 'status'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="flex-1 text-xs h-8 capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Live Flight Data - Compact */}
          {data.status.live && (
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Plane className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="text-sm font-medium">Live Data</span>
                    {isPlaying && (
                      <span className="text-xs text-blue-500 animate-pulse">♪</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCardExpansion('live')}
                    className="h-6 w-6 p-0"
                  >
                    {expandedCard === 'live' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center bg-white rounded p-2">
                    <Gauge className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-gray-600">Altitude</p>
                    <p className="font-semibold text-sm">{data.status.aircraft.altitude.toLocaleString()}</p>
                  </div>
                  <div className="text-center bg-white rounded p-2">
                    <Gauge className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <p className="text-xs text-gray-600">Speed</p>
                    <p className="font-semibold text-sm">{Math.round(data.status.aircraft.speed)}</p>
                  </div>
                </div>
                
                {expandedCard === 'live' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="text-center bg-white rounded p-2">
                      <Compass className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                      <p className="text-xs text-gray-600">Heading</p>
                      <p className="font-semibold text-sm">{data.status.aircraft.heading}°</p>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <MapPin className="h-4 w-4 mx-auto text-red-500 mb-1" />
                      <p className="text-xs text-gray-600">Position</p>
                      <p className="font-semibold text-xs">
                        {data.status.aircraft.currentPosition.lat.toFixed(2)}, {data.status.aircraft.currentPosition.lon.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flight Analysis - Compact */}
          <Card className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Analysis</h3>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {data.analysis.phase}
                  </Badge>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${data.analysis.onTime ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
                    {data.analysis.onTime ? 'On Time' : 'Delayed'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{data.analysis.summary}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="space-y-3">
          {/* Departure & Arrival - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <PlaneTakeoff className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Departure</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm truncate">{data.status.departure.name}</h3>
                  <p className="text-xs text-gray-600">{data.status.departure.city}, {data.status.departure.country}</p>
                  <p className="text-xs text-gray-500 mb-2">Code: {data.status.departure.code}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Scheduled</p>
                      <p className="font-medium">{formatTime(data.status.departure.scheduledTime)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gate</p>
                      <p className="font-medium">{data.status.departure.gate}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <PlaneLanding className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Arrival</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm truncate">{data.status.arrival.name}</h3>
                  <p className="text-xs text-gray-600">{data.status.arrival.city}, {data.status.arrival.country}</p>
                  <p className="text-xs text-gray-500 mb-2">Code: {data.status.arrival.code}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Scheduled</p>
                      <p className="font-medium">{formatTime(data.status.arrival.scheduledTime)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gate</p>
                      <p className="font-medium">{data.status.arrival.gate}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Stats */}
          <Card className="border border-gray-200">
            <CardContent className="p-3">
              <h3 className="text-sm font-medium mb-3">Route Details</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Distance</p>
                  <p className="text-lg font-bold text-blue-600">{data.status.distance}</p>
                  <p className="text-xs text-gray-500">km</p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Duration</p>
                  <p className="text-lg font-bold text-green-600">
                    {Math.floor(data.status.duration / 60)}h {data.status.duration % 60}m
                  </p>
                  <p className="text-xs text-gray-500">scheduled</p>
                </div>
                <div className="text-center bg-purple-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Progress</p>
                  <p className="text-lg font-bold text-purple-600">{data.status.progress}%</p>
                  <p className="text-xs text-gray-500">complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'aircraft' && (
        <Card className="border border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-3">
              <Plane className="h-4 w-4" />
              <span className="text-sm font-medium">Aircraft Information</span>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="font-semibold text-sm">{data.status.aircraft.type}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Registration</p>
                  <p className="font-semibold text-sm">{data.status.aircraft.registration}</p>
                </div>
              </div>
              
              {data.aircraft && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-600">Capacity</p>
                    <p className="font-semibold text-sm flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {data.aircraft.capacity}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-600">Cruise Speed</p>
                    <p className="font-semibold text-sm">{data.aircraft.speed} km/h</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'status' && (
        <div className="space-y-3">
          {/* Flight Timeline */}
          <Card className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Timeline</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <Clock className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Departure</p>
                    <p className="text-xs text-gray-600 truncate">
                      {formatTime(data.status.departure.scheduledTime)} from {data.status.departure.code}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(data.status.departure.scheduledTime)}
                  </Badge>
                </div>

                <div className={`flex items-center space-x-3 p-2 rounded-lg ${
                  data.status.status === 'active' ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    data.status.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Plane className={`h-3 w-3 ${
                      data.status.status === 'active' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Status</p>
                    <p className="text-xs text-gray-600">{data.status.status}</p>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(data.status.status)}`}>
                    {data.status.progress}%
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 p-2 bg-red-50 rounded-lg">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                    <Clock className="h-3 w-3 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Arrival</p>
                    <p className="text-xs text-gray-600 truncate">
                      {formatTime(data.status.arrival.scheduledTime)} at {data.status.arrival.code}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(data.status.arrival.scheduledTime)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delay Information */}
          {data.status.delay !== 0 && (
            <Card className={`border ${data.status.delay > 0 ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
              <CardContent className="p-3">
                <h3 className="text-sm font-medium mb-2">Delay Information</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${getDelayColor(data.status.delay)}`}>
                      {getDelayText(data.status.delay)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {data.status.delay > 0 
                        ? 'Behind schedule'
                        : 'Ahead of schedule'
                      }
                    </p>
                  </div>
                  <Clock className={`h-5 w-5 ${data.status.delay > 0 ? 'text-red-500' : 'text-blue-500'}`} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Compact Metadata */}
      <div className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">
        Updated: {format(new Date(data.timestamp), 'HH:mm:ss')} • 
        {data.date} • 
        {data.status.live && <span className="text-blue-500 animate-pulse">● LIVE</span>}
      </div>
    </div>
  )
}