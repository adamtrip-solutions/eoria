/**
 * Vitest mock for react-native-unistyles that understands variants. The same mock as
 * `@eoria/core/jest`, registered with `vi.mock`; see `mock.ts` for what it resolves.
 *
 * Usage in vitest config: `setupFiles: ['@eoria/core/vitest']`, with `@eoria/core` in
 * `server.deps.inline` so its own import of Unistyles reaches the mock too.
 */

import { createElement } from 'react'
// @ts-expect-error vitest is an optional peer and is not installed in this package.
import { vi } from 'vitest'
import { mockNitroModules, mockUnistyles } from './mock'

vi.mock('react-native-nitro-modules', () => mockNitroModules())

vi.mock('react-native-unistyles', () => mockUnistyles(createElement))

export {}
