import { useFonts } from 'expo-font'

/**
 * The bundled families the presets name. Keys are the PostScript names of the files, so a
 * build that embeds them through the expo-font config plugin (see app.json) skips the
 * runtime load, and a dev client built before the plugin was added still gets them. iOS
 * groups the faces under their family name, so `fontFamily: 'Geist'` plus `fontWeight`
 * selects one. Android only groups embedded fonts, which is what the plugin entry is for.
 */
const faces = {
  'Geist-Regular': require('@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf'),
  'Geist-Medium': require('@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf'),
  'Geist-SemiBold': require('@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf'),
  'Geist-Bold': require('@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf'),
  'Manrope-Medium': require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
  'Manrope-SemiBold': require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
  'Manrope-Bold': require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  'InstrumentSans-Regular': require('@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf'),
  'InstrumentSans-Medium': require('@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf'),
  'InstrumentSans-SemiBold': require('@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'),
  'Newsreader-Medium': require('@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf'),
  'Newsreader-SemiBold': require('@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf'),
  'IBMPlexSans-Regular': require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf'),
  'IBMPlexSans-SemiBold': require('@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf'),
  'IBMPlexSans-Bold': require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf'),
}

/** True once every face is registered, or loading failed and the system font stands in. */
export function usePresetFonts() {
  const [loaded, error] = useFonts(faces)
  return loaded || error !== null
}
