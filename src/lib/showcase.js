// Images for the customer app. Each entry tries your file in /public/images first,
// then the Lovable design image, then a labelled placeholder.
export const IMAGES = {
  // No separate login-bg.jpg exists — point straight at welcome-1.jpg so sign-in never
  // wastes a guaranteed-failed network request before falling back to it.
  loginBg: { src: '/images/welcome-1.jpg' },
  welcome1: { src: '/images/welcome-1.jpg' },
  welcome2: { src: '/images/welcome-2.jpg' },
  welcome3: { src: '/images/welcome-3.jpg' },
  welcome4: { src: '/images/welcome-4.jpg' },
  fleetS: { src: '/images/fleet-s-class.jpg' },
  fleetV: { src: '/images/fleet-v-class.jpg' },
  fleetE: { src: '/images/fleet-e-class.jpg' },
  fleetR: { src: '/images/fleet-range-rover.jpg' },
  hero: { src: '/images/welcome-1.jpg' },
  logo: { src: '/images/logo.svg' },
  profile: { src: '/images/avatar.png' },
  martin: { src: '/images/avatar.png' },
  saloon: { src: '/images/fleet-s-class.jpg' },
  van: { src: '/images/fleet-v-class.jpg' },
  detail: { src: '/images/fleet-s-class.jpg' },
  driver: { src: '/images/avatar.png' },
  vanDetail: { src: '/images/fleet-v-class.jpg' },
  map: { src: '/images/welcome-2.jpg' },
  tripCar: { src: '/images/fleet-s-class.jpg' },
  confirmed: { src: '/images/fleet-s-class.jpg' },
};

// Onboarding slides (Lovable "Welcome" screen). All share the hero image unless you add more.
export const ONBOARDING = [
  { image: 'welcome1', line1: 'Travel Beyond', line2: 'Expectations', text: 'Premium chauffeur services across the UK. Sovereign comfort and seamless journeys tailored precisely to your schedule.' },
  { image: 'welcome2', line1: 'First Class', line2: 'Every Journey', text: 'Every request is personally reviewed and confirmed by the Encore team.' },
  { image: 'welcome3', line1: 'Your Schedule.', line2: 'Our Priority.', text: 'Airport transfers, corporate travel, events and hourly hire — arranged around you.' },
  { image: 'welcome4', line1: 'Arrive in', line2: 'Exceptional Style', text: 'Immaculate vehicles and discreet, professional chauffeurs.' },
];

// Home category chips → journey types used by the request form.
export const CHIPS = [
  { key: 'all', label: 'All Fleet', icon: 'stars' },
  { key: 'airport', label: 'Airports', icon: 'flight_takeoff' },
  { key: 'event', label: 'Events & Galas', icon: 'theater_comedy' },
  { key: 'corporate', label: 'Corporate', icon: 'business_center' },
  { key: 'hourly', label: 'Hourly Chauffeur', icon: 'schedule' },
];

// "Express travel" rows on Home — no public prices (BRD: every journey is quoted).
export const ITINERARIES = [
  { type: 'airport', icon: 'connecting_airports', tone: 'bg-primary-fixed text-on-primary-fixed-variant', title: 'Airport Transfers', text: 'Flight tracking and meet & greet on request' },
  { type: 'corporate', icon: 'corporate_fare', tone: 'bg-secondary-container text-on-secondary-container', title: 'Corporate Travel', text: 'Executive standby for multi-stop meetings' },
  { type: 'event', icon: 'nightlife', tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', title: 'Evening Gala & Theatre', text: 'Curbside arrival with return journey' },
  { type: 'hourly', icon: 'schedule', tone: 'bg-surface-container text-on-surface', title: 'Hourly / As Directed', text: 'Your chauffeur for as long as you need' },
];

// `category` must match a vehicle category in Settings so "Book now" pre-selects it.
export const VEHICLES = [
  {
    slug: 's-class', name: 'Mercedes-Benz S-Class', category: 'Luxury Saloon', label: 'First Class Saloon', variant: 'Executive Long Wheelbase (LWB)',
    seats: '3', bags: '2', card: 'fleetS', gallery: ['fleetS', 'detail', 'confirmed'], glow: 'from-primary-container/35 via-tertiary-container/20',
    summary: 'Acoustic privacy glass, heated rear seats, quiet cabin',
    description: 'The pinnacle of luxury, whispered acoustic comfort and state-of-the-art performance. Ideal for executive airport transfers, VIP delegations and discreet corporate engagements.',
  },
  {
    slug: 'v-class', name: 'Mercedes-Benz V-Class', category: 'Executive MPV (7-seat)', label: 'Executive Chauffeur Van', variant: 'Executive MPV · up to 7 guests',
    seats: '7', bags: '7', card: 'fleetV', gallery: ['fleetV', 'vanDetail'], glow: 'from-tertiary-container/30',
    summary: 'Conference seating, generous luggage space, 7 passengers',
    description: 'Space for groups and luggage without compromising on comfort — perfect for families, delegations and airport runs with heavy luggage.',
  },
  {
    slug: 'e-class', name: 'Mercedes-Benz E-Class', category: 'Executive Saloon', label: 'Executive Saloon', variant: 'Business class saloon',
    seats: '3', bags: '2', card: 'fleetE', gallery: ['fleetE'], glow: 'from-primary-container/30',
    summary: 'Refined and understated for business travel',
    description: 'Refined, quiet and understated — the dependable choice for business and airport journeys.',
  },
  {
    slug: 'range-rover', name: 'Range Rover Sport', category: 'Luxury SUV', label: 'Luxury SUV', variant: 'All-weather luxury',
    seats: '4', bags: '4', card: 'fleetR', gallery: ['fleetR'], glow: 'from-tertiary-container/30',
    summary: 'Commanding presence, all-weather confidence',
    description: 'Commanding presence and all-weather confidence anywhere in the UK.',
  },
];

export const AMENITIES = [
  { icon: 'airline_seat_recline_extra', title: 'Leather seats', text: 'Nappa leather' },
  { icon: 'luggage', title: 'Luggage', text: 'Luggage assistance' },
  { icon: 'wifi', title: 'Wi-Fi', text: 'On request' },
  { icon: 'water_bottle', title: 'Bottled Water', text: 'Chilled mineral' },
  { icon: 'thermostat', title: 'Dual Climate', text: 'Acoustic glass' },
  { icon: 'bolt', title: 'Charging', text: 'USB-C ports' },
];
