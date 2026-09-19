// Expressive Code options. They sit in their own file because the <Code> component loads them
// at render time, and the selector function cannot pass through the Astro config as JSON.
import { defineEcConfig } from 'astro-expressive-code'

export default defineEcConfig({
  themes: ['github-dark', 'github-light'],
  themeCssSelector: (theme) => `[data-mode='${theme.type}']`,
  useDarkModeMediaQuery: false,
  styleOverrides: {
    borderRadius: 'var(--radius-lg)',
    borderWidth: '0',
    codeFontFamily: 'var(--mono)',
    codeFontSize: 'var(--text-sm)',
    codeLineHeight: '1.6',
    codePaddingBlock: 'var(--space-4)',
    codePaddingInline: 'var(--space-4)',
    codeBackground: 'var(--color-surface)',
    uiFontFamily: 'var(--font)',
    frames: {
      shadowColor: 'transparent',
      editorActiveTabBackground: 'var(--color-surface)',
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'var(--color-foreground)',
      editorTabBarBackground: 'var(--color-muted)',
      editorTabBarBorderBottomColor: 'transparent',
      editorActiveTabForeground: 'var(--color-foreground)',
      editorTabBarBorderColor: 'transparent',
      terminalBackground: 'var(--color-surface)',
      terminalTitlebarBackground: 'var(--color-muted)',
      terminalTitlebarBorderBottomColor: 'transparent',
      terminalTitlebarForeground: 'var(--color-muted-foreground)',
      frameBoxShadowCssValue: 'none',
      inlineButtonBackground: 'var(--color-muted)',
      inlineButtonBorder: 'transparent',
      inlineButtonForeground: 'var(--color-foreground)',
      tooltipSuccessBackground: 'var(--color-foreground)',
      tooltipSuccessForeground: 'var(--color-background)',
    },
  },
})
