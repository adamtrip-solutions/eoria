// The presets the site can switch between, read from the tokens so a preset added to
// @eoria/core shows up in the header menu, the landing picker and the stored-value check.
import { presets, type PresetName } from '@eoria/core/tokens'

export const presetNames = Object.keys(presets) as PresetName[]

/** One short line per preset for the appearance menu. */
export const presetHints: Record<PresetName, string> = {
  zinc: 'Neutral, native',
  moss: 'Warm, rounder',
  cobalt: 'Cool, sharper',
  iris: 'Product, hairline cards',
  tide: 'Tonal, soft corners',
  plum: 'Editorial, serif titles',
}
