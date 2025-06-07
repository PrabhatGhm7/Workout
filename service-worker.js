const CACHE_NAME = 'fitness-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Ensure the new service worker takes control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle different request types
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then(function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response since it's a stream
          const responseToCache = response.clone();

          // Add successful responses to cache (for future offline access)
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(function(error) {
        console.error('Fetch failed:', error);
        
        // Return a custom offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // For other requests, you could return a default response
        throw error;
      })
  );
});

// Handle background sync (optional - for future offline form submissions)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // This could be used to sync data when connection is restored
  return Promise.resolve();
}

// Handle push notifications (optional - for future notifications)
self.addEventListener('push', function(event) {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [100, 50, 100],
      actions: [
        {
          action: 'explore',
          title: 'View Exercise',
          icon: '/icon-explore.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('Exercise Tracker', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handling
self.addEventListener('error', function(event) {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});