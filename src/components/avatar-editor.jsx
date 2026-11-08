// Profile photo on the Profile screen: tap to choose a photo (camera or gallery), or remove it.
// The photo is cropped to a centred square and resized in the phone before upload (small and fast).
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon, UserAvatar } from '@/components/app-ui';

async function squarePhoto(file, size = 512) {
  if (!/^image\//.test(file.type)) throw new Error('Choose a photo (JPG, PNG or WebP).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('That photo could not be read. Try another one.')); i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.86));
    if (!blob) throw new Error('That photo could not be prepared. Try another one.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export function AvatarEditor({ user, onSaved }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true); setMenu(false);
    try {
      const blob = await squarePhoto(file);
      const u = await api.upload('/account/avatar', blob);
      onSaved?.(u); haptic('success'); toast.success('Profile photo updated.');
    } catch (e) { toast.error(e.body?.error || e.message || 'Could not update your photo.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMenu(false);
    try { onSaved?.(await api.del('/account/avatar')); toast.success('Profile photo removed.'); } catch (e) { toast.error(e.body?.error || 'Could not remove your photo.'); } finally { setBusy(false); }
  };
  return (
    <div className="relative flex-shrink-0">
      <button type="button" aria-label="Change profile photo" disabled={busy}
        onClick={() => { haptic('light'); if (user.avatar_url) setMenu((m) => !m); else input.current?.click(); }}
        className="relative block h-16 w-16 rounded-full ring-2 ring-primary-container/40 active:scale-95 transition-transform">
        <UserAvatar user={user} className="h-16 w-16 text-[26px]" />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary-container text-white ring-2 ring-inverse-surface">
          {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="photo_camera" className="!text-[14px]" />}
        </span>
      </button>
      {menu && (
        <div className="pop-in absolute left-0 top-[72px] z-20 w-44 overflow-hidden rounded-2xl bg-white py-1 text-[13.5px] font-semibold text-neutral-900 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
          <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-neutral-50"><Icon name="photo_camera" className="!text-[18px] text-primary" />Change photo</button>
          <button type="button" onClick={remove} className={cn('flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50')}><Icon name="delete" className="!text-[18px]" />Remove photo</button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
