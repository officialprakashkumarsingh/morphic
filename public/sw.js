const CACHE_VERSION = 'ahamai-v1.2'
const STATIC_CACHE_NAME = `ahamai-static-${CACHE_VERSION}`
const DYNAMIC_CACHE_NAME = `ahamai-dynamic-${CACHE_VERSION}`
const RUNTIME_CACHE_NAME = `ahamai-runtime-${CACHE_VERSION}`

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add common fonts and CSS that should be cached
]

// Runtime caching patterns
const RUNTIME_CACHE_PATTERNS = [
  { pattern: /^https:\/\/fonts\.googleapis\.com/, strategy: 'stale-while-revalidate' },
  { pattern: /^https:\/\/fonts\.gstatic\.com/, strategy: 'cache-first' },
  { pattern: /\.(?:js|css|woff2|woff|ttf)$/, strategy: 'stale-while-revalidate' },
  { pattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/, strategy: 'cache-first' }
]

// API endpoints to cache with short TTL
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.aviationstack\.com/,
  /\/api\//
]

// Cache duration settings (in seconds)
const CACHE_DURATIONS = {
  static: 30 * 24 * 60 * 60, // 30 days
  dynamic: 7 * 24 * 60 * 60, // 7 days
  api: 5 * 60, // 5 minutes
  images: 30 * 24 * 60 * 60 // 30 days
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing AhamAI Service Worker...')
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
      }),
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('ahamai-') && 
              !cacheName.includes(CACHE_VERSION)
            )
            .map(cacheName => caches.delete(cacheName))
        )
      })
    ]).then(() => {
      console.log('[SW] Installation complete, taking control')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating AhamAI Service Worker...')
  event.waitUntil(
    Promise.all([
      // Clear old version caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('ahamai-') && 
              !cacheName.includes(CACHE_VERSION)
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete, controlling all clients')
    })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different request types with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request))
  } else {
    event.respondWith(handleRuntimeRequest(request))
  }
})

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url)
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2|woff|ttf|ico)$/)
}

// Check if request is for an API endpoint
function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))
}

// Check if request is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'))
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.static)) {
      console.log('[SW] Serving from cache:', request.url)
      return cachedResponse
    }

    console.log('[SW] Fetching and caching static asset:', request.url)
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone()
      await cache.put(request, responseToCache)
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Handle API requests with network-first strategy and short cache
async function handleAPIRequest(request) {
  try {
    console.log('[SW] Fetching API request:', request.url)
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      const responseToCache = networkResponse.clone()
      await cache.put(request, responseToCache)
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] API request failed, trying cache:', error)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.api)) {
      console.log('[SW] Serving stale API response from cache')
      return cachedResponse
    }
    
    // Return a custom offline response for API failures
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        message: 'Please check your internet connection',
        offline: true 
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle navigation requests (HTML pages) with network-first strategy
async function handleNavigationRequest(request) {
  try {
    console.log('[SW] Handling navigation request:', request.url)
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      await cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Navigation request failed:', error)
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback to offline page or main app shell
    const offlineResponse = await caches.match('/')
    if (offlineResponse) {
      return offlineResponse
    }
    
    // Last resort - basic offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>AhamAI - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #1e293b; margin-bottom: 0.5rem; }
            p { color: #64748b; margin-bottom: 2rem; }
            button { 
              background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; cursor: pointer; font-size: 1rem;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✈️</div>
            <h1>AhamAI is Offline</h1>
            <p>You're currently offline. Some features may not be available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Handle runtime requests with stale-while-revalidate
async function handleRuntimeRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Serve from cache immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then(response => {
        if (response.ok) {
          cache.put(request, response.clone())
        }
      })
      .catch(() => {
        // Fail silently for background updates
      })
    
    return cachedResponse
  }
  
  // No cache, fetch from network
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Runtime request failed:', error)
    throw error
  }
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return true
  
  const responseDate = new Date(dateHeader)
  const now = new Date()
  const ageInSeconds = (now.getTime() - responseDate.getTime()) / 1000
  
  return ageInSeconds > maxAge
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Retry failed requests when connection is restored
      retryFailedRequests()
    )
  }
})

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  if (event.data) {
    const data = event.data.json()
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'AhamAI', {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: data.tag || 'default',
        data: data.data || {},
        actions: data.actions || []
      })
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})

// Utility function to retry failed requests
async function retryFailedRequests() {
  // Implementation for retrying failed requests
  // This could be used to sync data when connection is restored
  console.log('[SW] Retrying failed requests...')
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag)
  
  if (event.tag === 'cache-update') {
    event.waitUntil(updateCaches())
  }
})

// Update caches in background
async function updateCaches() {
  console.log('[SW] Updating caches in background...')
  
  const cache = await caches.open(STATIC_CACHE_NAME)
  
  // Update critical assets
  const updatePromises = STATIC_ASSETS.map(async (asset) => {
    try {
      const response = await fetch(asset, { cache: 'reload' })
      if (response.ok) {
        await cache.put(asset, response)
      }
    } catch (error) {
      console.warn('[SW] Failed to update asset:', asset, error)
    }
  })
  
  await Promise.all(updatePromises)
  console.log('[SW] Cache update complete')
}