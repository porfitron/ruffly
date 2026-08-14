/* Loaded by the generated service worker (vite-plugin-pwa importScripts). */

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target =
    event.notification?.data?.url ||
    (self.registration?.scope ? new URL('./', self.registration.scope).href : '/web/')

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/web') && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target)
        return undefined
      }),
  )
})
