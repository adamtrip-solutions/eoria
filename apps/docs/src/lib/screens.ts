// The showcase screens in apps/example/src/app/showcase, captured to public/screens by
// `pnpm --filter docs previews showcase/<name>`. The landing hero and /demos/ read this list.

export type Screen = {
  name: string
  title: string
  /** One line for tiles and the hero. */
  tagline: string
  /** A short paragraph for the demos page. */
  body: string
  components: string[]
}

export const screens: Screen[] = [
  {
    name: 'wallet',
    title: 'Wallet',
    tagline: 'Balance, budgets and a transaction sheet.',
    body: 'The balance sits on a Card filled with the primary colour, so it turns blue or rose with the preset. Budgets are Progress bars that switch to the destructive colour when a category runs over. Tap a transaction and a bottom Dialog opens with the amount, a category Badge and two actions.',
    components: [
      'card',
      'progress',
      'badge',
      'button',
      'avatar',
      'separator',
      'dialog',
      'toast',
      'text',
      'stack',
    ],
  },
  {
    name: 'home',
    title: 'Home',
    tagline: 'Rooms, climate, devices and scenes.',
    body: 'Rooms are chip Tabs that scroll off the edge. The climate Card pairs a large temperature with a Slider from 16 to 28 degrees, half a degree per step. Device tiles are Cards with a small Switch each, and the icon well fills with the primary colour when the device is on.',
    components: ['tabs', 'slider', 'switch', 'card', 'badge', 'button', 'toast', 'text', 'stack'],
  },
  {
    name: 'delivery',
    title: 'Your order',
    tagline: 'Live tracking with a tip sheet.',
    body: 'Four short Progress bars make the status rail, one per step. The courier Card holds an Avatar and two icon Buttons. An Alert confirms the drop-off note, a contained Accordion keeps the receipt out of the way, and a bottom Dialog picks the tip.',
    components: [
      'progress',
      'card',
      'avatar',
      'button',
      'alert',
      'accordion',
      'dialog',
      'toast',
      'text',
      'stack',
    ],
  },
]

export const screenSource = (name: string) =>
  `https://github.com/adamtrip-solutions/eoria/blob/main/apps/example/src/app/showcase/${name}.tsx`
