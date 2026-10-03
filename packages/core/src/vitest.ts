/**
 * Vitest mock for react-native-unistyles that understands variants. The same mock as
 * `@eoria/core/jest`, registered with `vi.mock`; see `mock.ts` for what it resolves.
 *
 * Usage in vitest config: `setupFiles: ['@eoria/core/vitest']`, with `@eoria/core` in
 * `server.deps.inline` so its own import of Unistyles reaches the mock too.
 *
 * ESM only: package.json exports no `require` condition for it, because Vitest refuses to be
 * required from CommonJS. Vitest imports setup files as ESM anyway.
 */

import { createElement } from 'react'
// @ts-expect-error vitest is not a dependency of this package, so it has no types here.
import { vi } from 'vitest'
import { mockNitroModules, mockUnistyles } from './mock'

vi.mock('react-native-nitro-modules', () => mockNitroModules())

vi.mock('react-native-unistyles', () => mockUnistyles(createElement))

export {}
