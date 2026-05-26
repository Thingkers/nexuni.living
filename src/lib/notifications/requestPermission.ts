export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return

  if (!('Notification' in window)) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}