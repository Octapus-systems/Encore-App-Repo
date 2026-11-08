// Android back key (gesture or button) in the phone app.
// Order: close an open pop-up → leave a section screen for Home → go to the previous screen.
// On a home screen it asks for a second press within 2 seconds before closing the app.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { App as CapApp } from '@capacitor/app';
import { isNative } from '@/lib/native';

const HOMES = ['/', '/app', '/driver', '/login', '/welcome'];
// Bottom-bar screens go straight back to their Home, whatever was opened before.
const TAB_HOME = [
  [/^\/app\/(bookings|account|notifications)\/?$/, '/app'],
  [/^\/driver\/updates\/?$/, '/driver'],
];

export function NativeBackButton() {
  const nav = useNavigate();
  const loc = useLocation();
  const where = useRef(loc.pathname);
  where.current = loc.pathname;
  const lastPress = useRef(0);

  useEffect(() => {
    if (!isNative()) return undefined;
    let handle;
    CapApp.addListener('backButton', () => {
      const path = where.current.replace(/\/+$/, '') || '/';

      // 1. An open pop-up or sheet closes first (they all close on Escape).
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"], .plan-sheet');
      if (dialog) {
        const close = dialog.querySelector('[aria-label="Back"], [aria-label="Close"], [aria-label="close"]');
        if (close) close.click();
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }

      // 2. Home: press twice to leave the app.
      if (HOMES.includes(path)) {
        const now = Date.now();
        if (now - lastPress.current < 2000) { CapApp.exitApp(); return; }
        lastPress.current = now;
        toast('Press back again to exit', { duration: 2000 });
        return;
      }

      // 3. Bottom-bar screens → their Home.
      const tab = TAB_HOME.find(([re]) => re.test(path));
      if (tab) { nav(tab[1]); return; }

      // 4. Anywhere else → previous screen (or Home if the app was opened straight onto this page).
      if (window.history.state?.idx > 0) nav(-1);
      else nav(path.startsWith('/driver') ? '/driver' : '/app', { replace: true });
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, [nav]);

  return null;
}
