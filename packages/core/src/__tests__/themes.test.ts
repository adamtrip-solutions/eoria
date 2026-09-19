import { createThemes, presets } from '../tokens'

describe('createThemes', () => {
  it('carries the destructive text colour of every preset', () => {
    for (const preset of Object.values(presets)) {
      const { light, dark } = createThemes(preset)
      expect(light.colors.destructiveText).toBe(preset.light.destructiveText)
      expect(dark.colors.destructiveText).toBe(preset.dark.destructiveText)
    }
  })

  it('falls back to the fill colour when a preset leaves destructiveText out', () => {
    const { destructiveText: _light, ...light } = presets.zinc.light
    const { destructiveText: _dark, ...dark } = presets.zinc.dark
    const themes = createThemes({ ...presets.zinc, light, dark })
    expect(themes.light.colors.destructiveText).toBe(light.destructive)
    expect(themes.dark.colors.destructiveText).toBe(dark.destructive)
  })
})
