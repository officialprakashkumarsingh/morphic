'use client'

import { useEffect, useRef,useState } from 'react'

import type { ToolInvocation } from 'ai'
import { format } from 'date-fns'
import { Clock, Compass, Gauge, MapPin, Pause,Plane, PlaneLanding, PlaneTakeoff, Play, Users, Volume2, VolumeX } from 'lucide-react'

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
      gate: string
      terminal: number
    }
    aircraft: {
      currentPosition: { lat: number; lon: number }
      altitude: number
      speed: number
      heading: number
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
    timezone: any
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
  weather: {
    departure: any
    arrival: any
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
    // Create a synthetic airplane sound using Web Audio API
    const createAirplaneSound = () => {
      if (typeof window === 'undefined') return null
      
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Create airplane engine sound
        const createEngineSound = () => {
          const oscillator1 = audioContext.createOscillator()
          const oscillator2 = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          const filter = audioContext.createBiquadFilter()
          
          // Low frequency rumble (engine)
          oscillator1.frequency.setValueAtTime(80, audioContext.currentTime)
          oscillator1.type = 'sawtooth'
          
          // Higher frequency hum (air)
          oscillator2.frequency.setValueAtTime(200, audioContext.currentTime)
          oscillator2.type = 'sine'
          
          // Filter for more realistic sound
          filter.type = 'lowpass'
          filter.frequency.setValueAtTime(800, audioContext.currentTime)
          
          // Volume control
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          
          // Connect the audio graph
          oscillator1.connect(filter)
          oscillator2.connect(filter)
          filter.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          return { oscillator1, oscillator2, gainNode, audioContext }
        }
        
        return createEngineSound
      } catch (e) {
        console.log('Web Audio API not supported')
        return null
      }
    }

    const soundGenerator = createAirplaneSound()
    
    if (soundGenerator && soundEnabled && data?.status?.live) {
      const sound = soundGenerator()
      if (sound) {
        sound.oscillator1.start()
        sound.oscillator2.start()
        setIsPlaying(true)
        
        // Cleanup function
        return () => {
          try {
            sound.oscillator1.stop()
            sound.oscillator2.stop()
            setIsPlaying(false)
          } catch (e) {
            // Oscillator already stopped
          }
        }
      }
    }
  }, [soundEnabled, data?.status?.live])

  if (tool.state === 'call') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Plane className="h-5 w-5 animate-bounce text-blue-500" />
          <span>Tracking flight...</span>
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
                <Plane className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Flight Tracking Error</h3>
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
        <p className="text-gray-500">No flight data available</p>
      </div>
    )
  }

  // Helper functions
  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm')
  }

  const formatDate = (isoString: string) => {
    return format(new Date(isoString), 'MMM dd, yyyy')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time': return 'bg-green-100 text-green-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      case 'in flight': return 'bg-blue-100 text-blue-800'
      case 'landed': return 'bg-gray-100 text-gray-800'
      case 'boarding': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
    if (delay > 0) return `${delay}m Delayed`
    return `${Math.abs(delay)}m Early`
  }

  const getDelayColor = (delay: number) => {
    if (delay === 0) return 'text-green-600'
    if (delay > 0) return 'text-red-600'
    return 'text-blue-600'
  }

  // Animated airplane component
  const AnimatedAirplane = ({ progress, isLive }: { progress: number, isLive: boolean }) => {
    const [position, setPosition] = useState(progress)
    
    useEffect(() => {
      if (isLive) {
        const interval = setInterval(() => {
          setPosition(prev => Math.min(prev + 0.1, 100))
        }, 1000)
        return () => clearInterval(interval)
      }
    }, [isLive])

    return (
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        {/* Flight path */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-200 transition-all duration-1000"
          style={{ width: `${position}%` }}
        />
        
        {/* Animated airplane */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-1000"
          style={{ left: `${Math.max(position - 2, 0)}%` }}
        >
          <div className={`text-blue-600 ${isLive ? 'animate-pulse' : ''}`}>
            {data?.analysis?.phase === 'takeoff' && <PlaneTakeoff className="h-4 w-4" />}
            {data?.analysis?.phase === 'approach' && <PlaneLanding className="h-4 w-4" />}
            {(data?.analysis?.phase === 'cruise' || !data?.analysis?.phase) && (
              <Plane className={`h-4 w-4 ${isLive ? 'animate-bounce' : ''}`} />
            )}
          </div>
        </div>
        
        {/* Departure marker */}
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2">
          <MapPin className="h-3 w-3 text-green-600" />
        </div>
        
        {/* Arrival marker */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
          <MapPin className="h-3 w-3 text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Flight Header with Sound Control */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                {getStatusIcon(data.status.status, data.analysis.phase)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{data.status.flightNumber}</h1>
                <p className="text-gray-600">{data.status.airline}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Sound Control */}
              {data.status.live && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="flex items-center space-x-1"
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="text-xs">
                      {isPlaying ? 'Playing' : soundEnabled ? 'Sound On' : 'Sound Off'}
                    </span>
                  </Button>
                </div>
              )}
              
              <div className="text-right">
                <Badge className={getStatusColor(data.status.status)}>
                  {data.status.status}
                </Badge>
                <div className={`text-sm font-medium ${getDelayColor(data.status.delay)}`}>
                  {getDelayText(data.status.delay)}
                </div>
              </div>
            </div>
          </div>

          {/* Flight Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{data.status.departure.code}</span>
              <span className="text-gray-500">{data.status.progress}% Complete</span>
              <span className="font-medium">{data.status.arrival.code}</span>
            </div>
            
            <AnimatedAirplane progress={data.status.progress} isLive={data.status.live} />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>{data.status.departure.city}</span>
              <span>{data.status.arrival.city}</span>
            </div>
          </div>

          {/* Key Flight Info */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Departure</p>
              <p className="font-semibold">{formatTime(data.status.departure.scheduledTime)}</p>
              <p className="text-xs text-gray-500">Gate {data.status.departure.gate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Arrival</p>
              <p className="font-semibold">{formatTime(data.status.arrival.scheduledTime)}</p>
              <p className="text-xs text-gray-500">Gate {data.status.arrival.gate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold">
                {Math.floor(data.status.duration / 60)}h {data.status.duration % 60}m
              </p>
              <p className="text-xs text-gray-500">{data.status.distance} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Aircraft</p>
              <p className="font-semibold">{data.aircraft.model}</p>
              <p className="text-xs text-gray-500">{data.aircraft.registration}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {['overview', 'route', 'aircraft', 'status'].map((tab) => (
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
          {/* Live Flight Data */}
          {data.status.live && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plane className="h-5 w-5 animate-pulse text-blue-500" />
                  <span>Live Flight Data</span>
                  {soundEnabled && (
                    <span className="text-xs text-blue-500 animate-pulse">♪ Engine Sound</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Gauge className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                    <p className="text-sm text-gray-600">Altitude</p>
                    <p className="font-semibold">{data.status.aircraft.altitude.toLocaleString()} ft</p>
                  </div>
                  <div className="text-center">
                    <Gauge className="h-6 w-6 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-gray-600">Speed</p>
                    <p className="font-semibold">{Math.round(data.status.aircraft.speed)} km/h</p>
                  </div>
                  <div className="text-center">
                    <Compass className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                    <p className="text-sm text-gray-600">Heading</p>
                    <p className="font-semibold">{data.status.aircraft.heading}°</p>
                  </div>
                  <div className="text-center">
                    <MapPin className="h-6 w-6 mx-auto text-red-500 mb-2" />
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="font-semibold text-xs">
                      {data.status.aircraft.currentPosition.lat.toFixed(2)}, {data.status.aircraft.currentPosition.lon.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flight Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Flight Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4 mb-4">
                <Badge className={getStatusColor(data.status.status)}>
                  {data.analysis.phase}
                </Badge>
                <Badge variant="outline">
                  {data.analysis.onTime ? 'On Schedule' : 'Delayed'}
                </Badge>
              </div>
              <p className="text-gray-700">{data.analysis.summary}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="space-y-4">
          {/* Departure Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlaneTakeoff className="h-5 w-5 text-green-500" />
                <span>Departure</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{data.status.departure.name}</h3>
                  <p className="text-gray-600">{data.status.departure.city}, {data.status.departure.country}</p>
                  <p className="text-sm text-gray-500">Airport Code: {data.status.departure.code}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Scheduled</p>
                    <p className="font-medium">{formatTime(data.status.departure.scheduledTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated</p>
                    <p className="font-medium">{formatTime(data.status.departure.estimatedTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gate</p>
                    <p className="font-medium">{data.status.departure.gate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Terminal</p>
                    <p className="font-medium">{data.status.departure.terminal}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arrival Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlaneLanding className="h-5 w-5 text-red-500" />
                <span>Arrival</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{data.status.arrival.name}</h3>
                  <p className="text-gray-600">{data.status.arrival.city}, {data.status.arrival.country}</p>
                  <p className="text-sm text-gray-500">Airport Code: {data.status.arrival.code}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Scheduled</p>
                    <p className="font-medium">{formatTime(data.status.arrival.scheduledTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated</p>
                    <p className="font-medium">{formatTime(data.status.arrival.estimatedTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gate</p>
                    <p className="font-medium">{data.status.arrival.gate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Terminal</p>
                    <p className="font-medium">{data.status.arrival.terminal}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Details */}
          <Card>
            <CardHeader>
              <CardTitle>Route Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="text-2xl font-bold text-blue-600">{data.status.distance}</p>
                  <p className="text-sm text-gray-500">kilometers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Flight Time</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.floor(data.status.duration / 60)}h {data.status.duration % 60}m
                  </p>
                  <p className="text-sm text-gray-500">scheduled</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="text-2xl font-bold text-purple-600">{data.status.progress}%</p>
                  <p className="text-sm text-gray-500">complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'aircraft' && (
        <div className="space-y-4">
          {/* Aircraft Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5" />
                <span>Aircraft Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Aircraft Type</p>
                    <p className="font-semibold text-lg">{data.aircraft.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration</p>
                    <p className="font-medium">{data.aircraft.registration}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Manufacturer</p>
                    <p className="font-medium">{data.aircraft.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model</p>
                    <p className="font-medium">{data.aircraft.model}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Passenger Capacity</p>
                    <p className="font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {data.aircraft.capacity} passengers
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cruise Speed</p>
                    <p className="font-medium">{data.aircraft.speed} km/h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Range</p>
                    <p className="font-medium">{data.aircraft.range} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Airline</p>
                    <p className="font-medium">{data.aircraft.airline}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Flight Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Flight Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Scheduled Departure</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(data.status.departure.scheduledTime)} from {data.status.departure.code}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatDate(data.status.departure.scheduledTime)}
                  </Badge>
                </div>

                <div className={`flex items-center space-x-4 p-3 rounded-lg ${
                  data.status.status === 'In Flight' ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    data.status.status === 'In Flight' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Plane className={`h-4 w-4 ${
                      data.status.status === 'In Flight' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Current Status</p>
                    <p className="text-sm text-gray-600">{data.status.status}</p>
                  </div>
                  <Badge className={getStatusColor(data.status.status)}>
                    {data.status.progress}% Complete
                  </Badge>
                </div>

                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                    <Clock className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Scheduled Arrival</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(data.status.arrival.scheduledTime)} at {data.status.arrival.code}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatDate(data.status.arrival.scheduledTime)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delay Information */}
          {data.status.delay !== 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Delay Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${
                  data.status.delay > 0 ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <p className={`font-semibold ${getDelayColor(data.status.delay)}`}>
                    {getDelayText(data.status.delay)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {data.status.delay > 0 
                      ? 'Flight is running behind schedule'
                      : 'Flight is ahead of schedule'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm:ss')} • 
        Flight Date: {data.date} • 
        {data.status.live && <span className="text-blue-500 animate-pulse">● LIVE</span>}
      </div>
    </div>
  )
}