import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { IMAGES } from '@/lib/showcase';
import { cn } from '@/lib/utils';

export function Icon({ name, className, fill }) {
  return <span className={cn('material-symbols-outlined', fill && 'icon-fill', className)} aria-hidden="true">{name}</span>;
}

/**
 * Image from IMAGES by key (or a direct src). Tries your file in /public/images,
 * then the design fallback, then shows a labelled placeholder.
 * Decodes off the main thread and is lazy by default — the slow-to-paint images some
 * phones saw were mostly a missing-local-file-then-slow-remote-fallback bug for several
 * images (fixed in showcase.js), but these attributes help on weaker devices generally.
 * `eager` is for the handful of images visible the instant a page opens (hero, logo).
 */
export function Img({ k, src, alt = '', className, placeholderClassName, style, eager = false }) {
  const entry = k ? IMAGES[k] : { src, fallback: null };
  const sources = [entry?.src, entry?.fallback].filter(Boolean);
  const [i, setI] = useState(0);
  if (i >= sources.length) {
    return (
      // Missing or failed photo: a quiet placeholder (no file names or dashed boxes in front of customers).
      <div role="img" aria-label={alt || undefined} className={cn('flex items-center justify-center bg-surface-container-low text-secondary/60', className, placeholderClassName, '!border-0')}>
        <Icon name="directions_car" className="!text-[32px]" />
      </div>
    );
  }
  return (
    <img
      src={sources[i]} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" {...{ fetchpriority: eager ? 'high' : 'auto' }}
      onError={() => setI(i + 1)} className={className} style={style}
    />
  );
}

/** The signed-in customer's photo, or their initials on an orange circle. */
export function UserAvatar({ user: given, className }) {
  const { user: me } = useAuth();
  const user = given || me;
  const [broken, setBroken] = useState(false);
  const src = user?.avatar_url && !broken ? `${API_BASE}${user.avatar_url}` : null;
  const initials = String(user?.name || '').replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  if (src) return <img src={src} alt="" onError={() => setBroken(true)} className={cn('rounded-full object-cover', className)} />;
  return <span className={cn('grid place-items-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#FF5A1F] font-extrabold leading-none tracking-tight text-white', className)}>{initials}</span>;
}

export function RoundButton({ children, className, label, ...props }) {
  return (
    <button type="button" aria-label={label} className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] transition-colors hover:bg-surface-container active:scale-95', className)} {...props}>
      {children}
    </button>
  );
}

export function useUnread() {
  const { data = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications'), refetchInterval: 10000 });
  return data.filter((n) => !n.read_at).length;
}

/** Fixed app header from the Lovable design (logo, title, bell, profile). */
export function EncoreHeader({ title, subtitle, back, overlay }) {
  const nav = useNavigate();
  const unread = useUnread();
  // Floating variant for map-first screens: no bar, just dark glass buttons over the map.
  if (overlay) {
    const glass = 'h-10 w-10 bg-[#141416]/80 text-white ring-1 ring-white/10 shadow-lg backdrop-blur-md hover:bg-[#141416]';
    return (
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-top">
        <h1 className="sr-only">{title}</h1>
        <div className="flex h-16 items-center justify-between px-margin">
          <div className="pointer-events-auto">
            {back && <RoundButton label="Go back" className={glass} onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}><Icon name="arrow_back" className="!text-[20px]" /></RoundButton>}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to="/app/notifications" className="relative">
              <RoundButton label="Notifications" className={glass}><Icon name="notifications" className="!text-[19px]" /></RoundButton>
              {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary-container ring-2 ring-[#141416]" />}
            </Link>
            <Link to="/app/account" className="rounded-full bg-[#141416]/80 p-[2px] shadow-lg ring-1 ring-white/10 backdrop-blur-md">
              <UserAvatar className="h-9 w-9 text-[15px]" />
            </Link>
          </div>
        </div>
      </header>
    );
  }
  return (
    <>
      <header className="animate-rise relative z-20 safe-top">
        <div className="flex h-[72px] items-center justify-between gap-space-sm px-margin">
          <div className="flex min-w-0 items-center gap-space-sm">
            {back && <RoundButton label="Go back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}><Icon name="arrow_back" className="!text-[20px]" /></RoundButton>}
            <Img k="logo" alt="Encore Chauffeurs" className="h-8 w-auto flex-shrink-0 object-contain" placeholderClassName="h-8 w-8 rounded-full border" />
            <div className="flex min-w-0 flex-col">
              {subtitle && (
                <div className="flex items-center gap-space-xs">
                  <Icon name="location_on" className="!text-[16px] text-primary-container" />
                  <span className="truncate text-label-sm font-label-sm uppercase tracking-wider text-secondary">{subtitle}</span>
                </div>
              )}
              <h1 className="truncate font-headline-sm text-headline-sm text-on-surface">{title}</h1>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-space-sm">
            <Link to="/app/notifications" className="relative">
              <RoundButton label="Notifications"><Icon name="notifications" className="!text-[20px]" /></RoundButton>
              {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary-container ring-2 ring-surface-container-lowest" />}
            </Link>
            <Link to="/app/account" className="rounded-full bg-surface-container-lowest p-[2px] shadow-[0_4px_16px_var(--encore-shadow-0-06)]">
              <UserAvatar className="h-8 w-8 text-[13px]" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
