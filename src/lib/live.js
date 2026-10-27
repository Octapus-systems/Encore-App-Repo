import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { celebrate } from '@/lib/fx';

// Good news worth a small celebration when it arrives.
const CELEBRATE = ['booking_confirmed', 'driver_accepted', 'journey_completed', 'quote_response', 'new_request'];

/**
 * Polls the user's notifications every few seconds. When a new one arrives it pops a
 * toast and refreshes every other screen's data, so changes made by management,
 * chauffeurs or customers show up without a manual reload.
 */
export function useLiveUpdates(linkFor) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const seen = useRef(null);
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/account/notifications'),
    refetchInterval: 6000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.map((n) => n.id));
    if (seen.current) {
      const fresh = data.filter((n) => !seen.current.has(n.id) && !n.read_at);
      if (fresh.length) {
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'notifications' });
        if (fresh.some((n) => CELEBRATE.includes(n.event))) celebrate();
        fresh.slice(0, 3).reverse().forEach((n) => {
          const to = n.booking_id && linkFor ? linkFor(n) : null;
          toast(n.title, {
            description: n.body,
            duration: 6000,
            action: to ? { label: 'View', onClick: () => nav(to) } : undefined,
          });
        });
        if (navigator.vibrate) navigator.vibrate(60);
      }
    }
    seen.current = ids;
  }, [data, qc, nav, linkFor]);

  return (data || []).filter((n) => !n.read_at).length;
}
