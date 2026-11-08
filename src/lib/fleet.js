// The fleet customers see, built from the vehicles management keeps in the Command Center
// (GET /api/fleet: one entry per make + model, retired/hidden vehicles left out).
// Models we already have curated artwork for (S-Class, V-Class, …) always keep that picture (and its
// cut-out shine) on their cards; an uploaded photo is added to their gallery. Any other model uses the
// uploaded photo, since it has no artwork of its own.
// FLEET is a single live array, so plain helpers (car pickers, image lookups) stay in step; screens
// call useFleet() so they re-render once the latest list arrives.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_BASE } from '@/lib/api';
import { IMAGES, VEHICLES } from '@/lib/showcase';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const maskOf = (key) => (IMAGES[key]?.src?.endsWith('.jpg') ? IMAGES[key].src.replace(/\.jpg$/, '-mask.png') : null);

export const FLEET = VEHICLES.map((v) => ({ ...v, mask: maskOf(v.card) }));

export function mergeFleet(list) {
  if (!Array.isArray(list) || !list.length) return VEHICLES.map((v) => ({ ...v, mask: maskOf(v.card) }));
  return list.map((m) => {
    const known = VEHICLES.find((v) => norm(v.name) === norm(m.name));
    // Uploaded photos are served by the API; register them so IMAGES lookups work everywhere.
    const reg = (url) => { const k = `fleet:${url.split('/').pop()}`; IMAGES[k] = { src: `${API_BASE}${url}` }; return k; };
    const gallery = (m.gallery || []).map(reg);
    const card = m.card_url ? reg(m.card_url) : null;
    const seats = String(m.seats || known?.seats || 1);
    const bags = String(m.bags ?? known?.bags ?? 0);
    if (known) {
      return {
        ...known, category: m.category || known.category, seats, bags,
        description: m.description || known.description,
        // The card keeps its studio artwork (with the cut-out shine) unless management chose a card image.
        ...(card ? { card, mask: null } : { mask: maskOf(known.card) }),
        // Gallery = the photos management uploaded; until there are any, the card picture alone.
        gallery: gallery.length ? gallery : [card || known.card],
      };
    }
    return {
      slug: m.slug, name: m.name, category: m.category, label: m.category, variant: m.category,
      seats, bags, card: card || gallery[0] || null, gallery: gallery.length ? gallery : [card], glow: 'from-primary-container/30', mask: null, custom: true,
      summary: m.description ? m.description.split(/(?<=[.!?])\s/)[0] : `Up to ${seats} passengers and ${bags} large cases`,
      description: m.description || `${m.name} — seats ${seats} passengers with room for ${bags} large cases.`,
    };
  });
}

/** Subscribe a screen to the live fleet. Returns the shared FLEET array. */
export function useFleet() {
  const { data } = useQuery({ queryKey: ['fleet'], queryFn: () => api.get('/fleet'), staleTime: 5 * 60000 });
  return useMemo(() => {
    if (data) FLEET.splice(0, FLEET.length, ...mergeFleet(data));
    return [...FLEET];
  }, [data]);
}
