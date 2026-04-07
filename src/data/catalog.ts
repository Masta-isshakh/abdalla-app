import { Offer, ServiceCategory, ServiceCategoryKey, Testimonial } from '../types';

export const serviceCatalog: ServiceCategory[] = [
  {
    key: 'cleaning',
    title: 'Home Cleaning',
    subtitle: 'Routine care for apartments, villas, and move-ins.',
    shortDescription: 'Book trusted cleaners for regular sessions or one-off intensive refreshes.',
    accent: '#0F7B45',
    background: '#E8FFF2',
    icon: 'sparkles-outline',
    heroMetric: '60 min booking flow',
    benefits: ['Same-day slots', 'Recurring weekly plans', 'Verified professionals', 'Eco-safe supplies'],
    packages: [
      {
        id: 'cleaning-regular',
        title: 'Regular Refresh',
        subtitle: 'Best for weekly upkeep',
        duration: '2 hours',
        price: 89,
        features: ['Kitchen and bathrooms', 'Dusting and mopping', 'Bedroom tidy-up'],
      },
      {
        id: 'cleaning-deep',
        title: 'Deep Clean',
        subtitle: 'Seasonal reset for busy homes',
        duration: '4 hours',
        price: 199,
        features: ['Cabinet exteriors', 'Baseboards', 'Detailed bathroom scrub'],
      },
      {
        id: 'cleaning-move',
        title: 'Move In / Out',
        subtitle: 'Vacant property handover standard',
        duration: '6 hours',
        price: 329,
        features: ['Inside windows', 'Empty cabinet clean', 'High-touch disinfection'],
      },
    ],
    extras: [
      { id: 'cleaning-ironing', title: 'Add ironing', price: 25 },
      { id: 'cleaning-fridge', title: 'Inside fridge clean', price: 18 },
      { id: 'cleaning-balcony', title: 'Balcony wash', price: 22 },
    ],
  },
  {
    key: 'laundry',
    title: 'Laundry & Dry Cleaning',
    subtitle: 'Pickup, clean, press, and deliver.',
    shortDescription: 'Doorstep laundry with live status updates and item-safe handling.',
    accent: '#227A73',
    background: '#E9FFFC',
    icon: 'shirt-outline',
    heroMetric: 'Free pickup in Doha',
    benefits: ['Wash and fold', 'Dry cleaning', 'Express turnaround', 'Live order progress'],
    packages: [
      {
        id: 'laundry-everyday',
        title: 'Everyday Bundle',
        subtitle: 'Family essentials, folded and ready',
        duration: '24 hours',
        price: 59,
        features: ['Up to 6 kg', 'Sort by color', 'Folded delivery'],
      },
      {
        id: 'laundry-premium',
        title: 'Premium Garment Care',
        subtitle: 'For delicate fabrics and formalwear',
        duration: '48 hours',
        price: 119,
        features: ['Dry cleaning', 'Steam pressing', 'Protective packaging'],
      },
      {
        id: 'laundry-express',
        title: 'Express Press & Fold',
        subtitle: 'Fast turnaround when time is tight',
        duration: '12 hours',
        price: 85,
        features: ['Priority handling', 'SMS updates', 'On-time delivery'],
      },
    ],
    extras: [
      { id: 'laundry-stain', title: 'Stain treatment', price: 12 },
      { id: 'laundry-shoes', title: 'Sneaker cleaning', price: 35 },
      { id: 'laundry-curtains', title: 'Curtain care', price: 29 },
    ],
  },
  {
    key: 'carwash',
    title: 'Car Wash',
    subtitle: 'Professional car care at home or office.',
    shortDescription: 'Exterior shine, interior detailing, and valet packages where your car is parked.',
    accent: '#145DA0',
    background: '#EEF7FF',
    icon: 'car-sport-outline',
    heroMetric: 'No queues, no driving',
    benefits: ['At-home wash', 'Interior detailing', 'Office parking support', 'Flexible vehicle types'],
    packages: [
      {
        id: 'carwash-exterior',
        title: 'Exterior Shine',
        subtitle: 'Quick clean for daily drivers',
        duration: '35 minutes',
        price: 45,
        features: ['Body wash', 'Wheel rinse', 'Hand dry finish'],
      },
      {
        id: 'carwash-interior',
        title: 'Interior Detail',
        subtitle: 'Cabin refresh and odor control',
        duration: '60 minutes',
        price: 95,
        features: ['Vacuuming', 'Dashboard clean', 'Mat treatment'],
      },
      {
        id: 'carwash-valet',
        title: 'Full Valet',
        subtitle: 'Complete care inside and out',
        duration: '90 minutes',
        price: 139,
        features: ['Exterior polish', 'Interior detail', 'Tire dressing'],
      },
    ],
    extras: [
      { id: 'carwash-engine', title: 'Engine bay clean', price: 30 },
      { id: 'carwash-wax', title: 'Wax protection', price: 40 },
      { id: 'carwash-pet', title: 'Pet hair removal', price: 22 },
    ],
  },
  {
    key: 'homecare',
    title: 'Homecare',
    subtitle: 'Specialist maintenance and deep treatment.',
    shortDescription: 'AC care, pest control, and upholstery treatment from trained specialists.',
    accent: '#3B7F5D',
    background: '#EFFAF2',
    icon: 'home-outline',
    heroMetric: 'Certified specialists',
    benefits: ['AC maintenance', 'Pest control', 'Mattress cleaning', 'Professional-grade equipment'],
    packages: [
      {
        id: 'homecare-ac',
        title: 'AC Cleaning',
        subtitle: 'Improve airflow and cooling efficiency',
        duration: '75 minutes',
        price: 149,
        features: ['Filter wash', 'Vent clean', 'Cooling check'],
      },
      {
        id: 'homecare-pest',
        title: 'Pest Control Visit',
        subtitle: 'Targeted treatment with safe protocols',
        duration: '90 minutes',
        price: 219,
        features: ['Inspection', 'Treatment plan', 'Follow-up guidance'],
      },
      {
        id: 'homecare-upholstery',
        title: 'Sofa & Mattress Care',
        subtitle: 'Deep extraction and sanitization',
        duration: '120 minutes',
        price: 259,
        features: ['Fabric-safe treatment', 'Dry extraction', 'Odor neutralizing'],
      },
    ],
    extras: [
      { id: 'homecare-anti', title: 'Anti-allergen finish', price: 27 },
      { id: 'homecare-follow', title: 'Follow-up inspection', price: 35 },
      { id: 'homecare-urgent', title: 'Urgent same-day dispatch', price: 49 },
    ],
  },
];

export const promotions: Offer[] = [
  {
    id: 'welcome',
    title: 'Welcome to Jahzeen',
    description: 'Use your first booking to unlock a full service-fee waiver.',
    code: 'JAHZEEN10',
  },
  {
    id: 'weekly-clean',
    title: 'Weekly clean plan',
    description: 'Recurring home cleaning customers save on every fourth session.',
    code: 'WEEKLYCARE',
  },
  {
    id: 'bundle',
    title: 'Laundry + car wash',
    description: 'Stack two services in one day and get a bundled discount.',
    code: 'HOMEFLOW',
  },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote: 'Everything from pickup timing to service quality felt smooth and dependable.',
    name: 'Maha A.',
    service: 'Laundry',
  },
  {
    id: 't2',
    quote: 'The booking flow is fast, the team arrives on time, and the pricing is clear.',
    name: 'Yousef K.',
    service: 'Home Cleaning',
  },
  {
    id: 't3',
    quote: 'I booked AC care and sofa cleaning in the same week and both were excellent.',
    name: 'Noura F.',
    service: 'Homecare',
  },
];

export const howItWorks = [
  'Choose a service',
  'Select your package and time',
  'Confirm the address and payment method',
  'Track your specialist until completion',
];

export function getServiceByKey(key: ServiceCategoryKey) {
  return serviceCatalog.find((service) => service.key === key) ?? serviceCatalog[0];
}
