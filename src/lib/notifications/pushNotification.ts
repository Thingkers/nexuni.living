export function pushNotification({
  title,
  body,
}: {
  title: string
  body: string
}) {
  if (typeof window === 'undefined') return

  if (!('Notification' in window)) return

  if (Notification.permission !== 'granted') return

  new Notification(title, {
    body,
    icon: '/icon-512.png',
  })
}