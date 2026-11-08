import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

/**
 * Add a calendar event (.ics) to the device. Installed app: writes a temporary file and opens
 * the share sheet so the customer can choose "Calendar" / "Add to calendar" themselves —
 * this avoids silently dropping a file into Downloads with an Android "file saved" notification.
 * Browser: falls back to a normal file download, which is the correct behaviour there.
 */
export async function addToDeviceCalendar(ics, filename) {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({ path: filename, data: ics, directory: Directory.Cache, encoding: 'utf8' });
    await Share.share({ title: 'Add to calendar', url: uri, dialogTitle: 'Add to your calendar' });
    return 'shared';
  }
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// ---------- push notifications (Firebase) ----------
// Only in builds made with VITE_PUSH=on — those include the Firebase config (google-services.json).
// Registering without it would crash Android, so other builds skip push entirely.
let pushStarted = false;
export async function initPush(linkFor, onOpen) {
  if (pushStarted || !isNative() || import.meta.env.VITE_PUSH !== 'on') return;
  pushStarted = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { api } = await import('@/lib/api');
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;
    await PushNotifications.addListener('registration', (t) => { api.post('/account/devices', { token: t.value, platform: Capacitor.getPlatform() }).catch(() => {}); });
    await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const d = a.notification?.data || {};
      onOpen?.(linkFor({ booking_id: d.booking_id ? Number(d.booking_id) : null, event: d.event }));
    });
    await PushNotifications.register();
  } catch { pushStarted = false; }
}
