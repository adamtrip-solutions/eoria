// Shared data for commerce previews and demo routes.
import { useState, type ReactElement } from 'react'
import { Download, Sparkles, Cloud } from 'lucide-react-native'
import { ProductDetail, type ProductDetailProps } from '@/components/blocks/product-detail'
import { FilterSheet, type FilterGroup, type FilterValues } from '@/components/blocks/filter-sheet'
import { Paywall, type PaywallFeature, type PaywallPlan } from '@/components/blocks/paywall'

const noop = () => {}

export const product: Omit<ProductDetailProps, 'onAddToCart'> = {
  images: [
    { uri: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&auto=format&fit=crop' },
    {
      uri: 'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=900&auto=format&fit=crop',
    },
  ],
  title: 'Everyday hoodie',
  price: 64,
  currency: 'EUR',
  locale: 'en-IE',
  rating: 4.8,
  ratingCount: 128,
  badge: 'Low stock',
  description: 'A soft cotton layer for cool mornings. Relaxed fit, with a roomy front pocket.',
  stock: 5,
  options: [
    { value: 's', label: 'S' },
    { value: 'm', label: 'M' },
    { value: 'l', label: 'L' },
    { value: 'xl', label: 'XL' },
  ],
  sections: [
    { id: 'details', title: 'Details', body: 'Organic cotton. Machine wash cold and hang to dry.' },
    {
      id: 'shipping',
      title: 'Shipping',
      body: 'Ships in 2 to 3 working days. Delivery is calculated at checkout.',
    },
    { id: 'returns', title: 'Returns', body: 'Return unworn items within 30 days.' },
  ],
}

export const filterGroups: FilterGroup[] = [
  { kind: 'chips', id: 'sizes', title: 'Size', multiple: true, options: product.options ?? [] },
  {
    kind: 'toggle',
    id: 'fit',
    title: 'Fit',
    options: [
      { value: 'regular', label: 'Regular' },
      { value: 'relaxed', label: 'Relaxed' },
    ],
  },
  {
    kind: 'range',
    id: 'price',
    title: 'Price',
    min: 0,
    max: 200,
    step: 5,
    format: (value) => `€${value}`,
  },
  {
    kind: 'radio',
    id: 'sort',
    title: 'Sort by',
    options: [
      { value: 'recommended', label: 'Recommended' },
      { value: 'price', label: 'Price: low to high' },
      { value: 'new', label: 'Newest first' },
    ],
  },
  { kind: 'switch', id: 'inStock', title: 'In stock only' },
]

export const filterValues: FilterValues = {
  sizes: ['m'],
  fit: 'relaxed',
  price: 100,
  sort: 'recommended',
  inStock: true,
}

export const paywallFeatures: PaywallFeature[] = [
  {
    icon: <Sparkles />,
    title: 'Every collection',
    description: 'Use all current and future collections.',
  },
  {
    icon: <Download />,
    title: 'Available offline',
    description: 'Download favourites to take with you.',
  },
  { icon: <Cloud />, title: 'Sync across devices', description: 'Pick up where you left off.' },
]

export const paywallPlans: PaywallPlan[] = [
  {
    id: 'annual',
    title: 'Yearly',
    price: '€39.99',
    period: 'year',
    badge: 'Most popular',
    perMonth: 'About €3.33 per month',
    description: 'Billed once a year. Cancel anytime.',
  },
  {
    id: 'monthly',
    title: 'Monthly',
    price: '€4.99',
    period: 'month',
    description: 'Billed monthly. Cancel anytime.',
  },
]

function ProductPreview() {
  const [value, setValue] = useState<string | undefined>('m')
  const [favourite, setFavourite] = useState(false)
  return (
    <ProductDetail
      {...product}
      value={value}
      onValueChange={setValue}
      favourite={favourite}
      onToggleFavourite={() => setFavourite((current) => !current)}
      onShare={noop}
      onBack={noop}
      onAddToCart={noop}
    />
  )
}

function FilterPreview() {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState(filterValues)
  return (
    <FilterSheet
      open={open}
      onOpenChange={setOpen}
      groups={filterGroups}
      value={value}
      onApply={setValue}
      onReset={noop}
      resultCount={42}
    />
  )
}

export const commerceBlockPreviews: Record<string, () => ReactElement> = {
  'product-detail': () => <ProductPreview />,
  'filter-sheet': () => <FilterPreview />,
  paywall: () => (
    <Paywall
      title="Make room for more"
      subtitle="Your favourites, wherever you go."
      features={paywallFeatures}
      plans={paywallPlans}
      onSelectPlan={noop}
      onRestore={noop}
      onTerms={noop}
      onPrivacy={noop}
      onClose={noop}
    />
  ),
}
