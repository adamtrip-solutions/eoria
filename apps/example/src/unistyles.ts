import { configureUnistyles, defaultThemes, type EoriaTheme } from '@eoria/core'

// Tell Unistyles which themes exist so `theme` is typed everywhere.
declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    light: EoriaTheme
    dark: EoriaTheme
  }
}

configureUnistyles({ themes: defaultThemes })
