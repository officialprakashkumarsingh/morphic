const CACHE_NAME = 'flight-tracker-v1'
const STATIC_CACHE_NAME = 'flight-tracker-static-v1'
const DYNAMIC_CACHE_NAME = 'flight-tracker-dynamic-v1'

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.aviationstack\.com/,
  /\/api\//
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Skip waiting')
        return self.skipWaiting()
      })
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Taking control')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests with network-first strategy
  if (isApiRequest(request)) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Handle page requests with stale-while-revalidate strategy
  if (isPageRequest(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request))
    return
  }

  // Default to network-first for everything else
  event.respondWith(networkFirstStrategy(request))
})

// Check if request is for API
function isApiRequest(request) {
  const url = new URL(request.url)
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url)) ||
         url.pathname.startsWith('/api/')
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.includes('.') && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  )
}

// Check if request is for a page
function isPageRequest(request) {
  const url = new URL(request.url)
  return request.destination === 'document' || 
         (!url.pathname.includes('.') && request.headers.get('accept')?.includes('text/html'))
}

// Network-first strategy (good for API calls and critical data)
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // If successful, update cache and return response
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    // If network fails, try cache
    return await getCachedResponse(request)
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error)
    return await getCachedResponse(request)
  }
}

// Cache-first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  try {
    // Try cache first
    const cachedResponse = await getCachedResponse(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If not in cache, fetch from network and cache
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[SW] Cache-first strategy failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Stale-while-revalidate strategy (good for pages)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  
  // Get cached version immediately
  const cachedResponse = await cache.match(request)
  
  // Fetch updated version in background
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => cachedResponse)
  
  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || networkPromise
}

// Get cached response from any cache
async function getCachedResponse(request) {
  const cacheNames = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, CACHE_NAME]
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
  }
  
  return null
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'flight-data-sync') {
    event.waitUntil(syncFlightData())
  }
})

// Sync flight data when connectivity is restored
async function syncFlightData() {
  try {
    // This would sync any pending flight data requests
    console.log('[SW] Syncing flight data...')
    
    // Get all clients (open tabs/windows)
    const clients = await self.clients.matchAll()
    
    // Notify clients that sync is happening
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED',
        message: 'Syncing flight data...'
      })
    })
    
    // Perform sync operations here
    // For now, just notify completion
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        message: 'Flight data synced successfully'
      })
    })
    
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Handle push notifications (for flight updates)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  let title = 'Flight Update'
  let options = {
    body: 'Your flight status has been updated',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  if (event.data) {
    try {
      const payload = event.data.json()
      title = payload.title || title
      options.body = payload.body || options.body
      options.data = { ...options.data, ...payload.data }
    } catch (error) {
      console.error('[SW] Error parsing push payload:', error)
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'view') {
    // Open the app to show flight details
    event.waitUntil(
      clients.openWindow('/')
    )
  }
  // 'dismiss' action just closes the notification
})

// Message handling for communication with the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      }).then(() => {
        event.ports[0].postMessage({ success: true })
      })
    )
  }
})

// Periodic background sync (for updating flight data)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag)
  
  if (event.tag === 'flight-updates') {
    event.waitUntil(syncFlightData())
  }
})

console.log('[SW] Service Worker loaded')