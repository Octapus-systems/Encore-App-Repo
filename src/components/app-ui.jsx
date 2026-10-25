import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { IMAGES } from '@/lib/showcase';
import { cn } from '@/lib/utils';

export function Icon({ name, className, fill }) {
  return <span className={cn('material-symbols-outlined', fill && 'icon-fill', className)} aria-hidden="true">{name}</span>;
}

/**
 * Image from IMAGES by key (or a direct src). Tries your file in /public/images,
 * then the design fallback, then shows a labelled placeholder.
 */
export function Img({ k, src, alt = '', className, placeholderClassName, style }) {
  const entry = k ? IMAGES[k] : { src, fallback: null };
  const sources = [entry?.src, entry?.fallback].filter(Boolean);
  const [i, setI] = useState(0);
  if (i >= sources.length) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-1 border-2 border-dashed border-outline-variant bg-surface-container-low text-center text-secondary', className, placeholderClassName)}>
        <Icon name="image" className="!text-[22px]" />
        <span className="px-2 text-[10px] font-medium leading-tight">{(entry?.src || 'image').replace('/images/', '')}</span>
      </div>
    );
  }
  return <img src={sources[i]} alt={alt} onError={() => setI(i + 1)} className={className} style={style} />;
}

export function RoundButton({ children, className, label, ...props }) {
  return (
    <button type="button" aria-label={label} className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] transition-colors hover:bg-surface-container active:scale-95', className)} {...props}>
      {children}
    </button>
  );
}

function useUnread() {
  const { data = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications'), refetchInterval: 10000 });
  return data.filter((n) => !n.read_at).length;
}

/** Fixed app header from the Lovable design (logo, title, bell, profile). */
export function EncoreHeader({ title, subtitle, back }) {
  const nav = useNavigate();
  const unread = useUnread();
  return (
    <>
      <header className="fixed left-1/2 top-0 z-50 w-full max-w-[480px] -translate-x-1/2 bg-surface/85 shadow-[0_1px_8px_var(--encore-shadow-0-03)] backdrop-blur-xl safe-top">
        <div className="flex h-20 items-center justify-between gap-space-sm px-margin">
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
              <Img k="profile" alt="Profile" className="h-8 w-8 rounded-full object-cover" placeholderClassName="h-8 w-8 rounded-full" />
            </Link>
          </div>
        </div>
      </header>
      <div className="h-20" />
    </>
  );
}
