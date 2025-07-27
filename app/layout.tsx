import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'

import { Analytics } from '@vercel/analytics/next'

import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

import AppSidebar from '@/components/app-sidebar'
import ArtifactRoot from '@/components/artifact/artifact-root'
import Header from '@/components/header'
import { PWAInstall } from '@/components/pwa-install'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = 'Flight Tracker Pro - Morphic'
const description =
  'Real-time flight tracking with live status, route mapping, and aircraft details. A fully open-source AI-powered flight tracking application.'

export const metadata: Metadata = {
  metadataBase: new URL('https://morphic.sh'),
  title,
  description,
  openGraph: {
    title,
    description,
    images: ['/icons/icon-512x512.png']
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@miiura'
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flight Tracker Pro',
    startupImage: [
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 768px) and (device-height: 1024px)'
      }
    ]
  },
  applicationName: 'Flight Tracker Pro',
  keywords: ['flight', 'tracker', 'aviation', 'real-time', 'aircraft', 'airport', 'travel'],
  category: 'travel'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ]
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  let user = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser }
    } = await supabase.auth.getUser()
    user = supabaseUser
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Flight Tracker Pro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Flight Tracker Pro" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        
        {/* Performance and UX Hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/sw.js" as="script" />
        <link rel="dns-prefetch" href="//api.aviationstack.com" />
      </head>
      <body
        className={cn(
          'min-h-screen flex flex-col font-sans antialiased overflow-x-hidden',
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <Header user={user} />
              <main className="flex flex-1 min-h-0 overflow-hidden pt-12">
                <div className="flex-1 flex flex-col min-w-0">
                  <ArtifactRoot>{children}</ArtifactRoot>
                </div>
              </main>
            </div>
          </SidebarProvider>
          <Toaster />
          <Analytics />
          <PWAInstall />
        </ThemeProvider>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      
                      // Listen for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New content is available, show update notification
                              if (window.confirm('New version available! Reload to update?')) {
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
                
                // Handle service worker messages
                navigator.serviceWorker.addEventListener('message', event => {
                  if (event.data.type === 'SYNC_COMPLETED') {
                    console.log('Flight data synced:', event.data.message);
                  }
                });
              }
              
              // Add to home screen prompt
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                
                // Show install button or banner
                const installButton = document.querySelector('#install-pwa');
                if (installButton) {
                  installButton.style.display = 'block';
                  installButton.addEventListener('click', () => {
                    installButton.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                      if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the A2HS prompt');
                      }
                      deferredPrompt = null;
                    });
                  });
                }
              });
              
              // Handle app installed
              window.addEventListener('appinstalled', (evt) => {
                console.log('Flight Tracker PWA was installed');
              });
              
              // Performance optimizations
              if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                  // Prefetch critical API endpoints
                  if ('fetch' in window) {
                    fetch('/api/health').catch(() => {});
                  }
                });
              }
              
              // Add haptic feedback for mobile
              function addHapticFeedback() {
                if ('vibrate' in navigator) {
                  document.addEventListener('click', (e) => {
                    if (e.target.closest('button, [role="button"]')) {
                      navigator.vibrate(10);
                    }
                  });
                }
              }
              
              if (document.readyState === 'complete') {
                addHapticFeedback();
              } else {
                window.addEventListener('load', addHapticFeedback);
              }
            `
          }}
        />
      </body>
    </html>
  )
}
