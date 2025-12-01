// sw.js - Service Worker
const CACHE_NAME = 'isletme-v3';
const APP_VERSION = '3.0';

// Önbelleğe alınacak dosyalar
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// KURULUM
self.addEventListener('install', event => {
  console.log('🟢 Service Worker Kuruluyor v' + APP_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Dosyalar önbelleğe alınıyor...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Kurulum tamam!');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Kurulum hatası:', err);
      })
  );
});

// AKTİVASYON
self.addEventListener('activate', event => {
  console.log('🟡 Service Worker Aktif Ediliyor...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker aktif!');
      return self.clients.claim();
    })
  );
});

// İSTEKLERİ YAKALA
self.addEventListener('fetch', event => {
  // Chrome eklentilerini geç
  if (event.request.url.includes('chrome-extension')) {
    return;
  }
  
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache'de varsa onu döndür
        if (cachedResponse) {
          return cachedResponse;
        }

        // Cache'de yoksa network'ten al
        return fetch(event.request)
          .then(networkResponse => {
            // Başarılı response'ları cache'le
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            // Network hatası durumunda fallback
            console.log('🌐 Offline mod:', error);
            
            // HTML isteği için ana sayfayı döndür
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // İkon isteği için fallback ikon
            if (event.request.url.includes('.png')) {
              return caches.match('./icon-192.png');
            }
            
            // Diğer durumlar için basit mesaj
            return new Response('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// PUSH BİLDİRİMLERİ
self.addEventListener('push', event => {
  const data = event.data ? event.data.text() : 'Yeni bildirim';
  
  const options = {
    body: data,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('İşletme Yöneticisi', options)
  );
});

// BİLDİRİM TIKLAMA
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Açık pencere varsa ona odaklan
        for (const client of clientList) {
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        // Yoksa yeni pencere aç
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// SENKRONİZASYON
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Arkaplan senkronizasyonu');
  }
});

// MESAJLAŞMA
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});