import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = () => Capacitor.isNativePlatform();

let ready = null;
/** Ask for notification permission once and create the Android channel. Native app only. */
export function initNativeNotifications(onOpen) {
  if (!isNative()) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') return false;
        await LocalNotifications.createChannel({ id: 'encore-updates', name: 'Journey updates', description: 'Quotes, confirmations and chauffeur updates', importance: 4, visibility: 1, vibration: true, lights: true, lightColor: '#FF6B00' });
        await LocalNotifications.addListener('localNotificationActionPerformed', (e) => onOpen?.(e.notification.extra));
        return true;
      } catch { return false; }
    })();
  }
  return ready;
}

/** Show a real phone notification (status bar + sound). Returns false if it could not be shown. */
export async function showNativeNotification({ id, title, body, extra }) {
  if (!(await initNativeNotifications())) return false;
  try {
    await LocalNotifications.schedule({ notifications: [{ id: id % 2147483647, title, body, channelId: 'encore-updates', extra, smallIcon: 'ic_stat_encore', iconColor: '#FF6B00' }] });
    return true;
  } catch { return false; }
}
