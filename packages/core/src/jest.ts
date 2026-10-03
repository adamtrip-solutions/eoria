/**
 * Jest mock for react-native-unistyles that understands variants. The mock itself lives in
 * `mock.ts`; see there for what it resolves and why.
 *
 * Usage in jest config: `setupFiles: ['@eoria/core/jest']`
 */

import { mockNitroModules, mockUnistyles } from './mock'

declare const require: (id: string) => unknown

jest.mock('react-native-nitro-modules', () => mockNitroModules(), { virtual: true })

jest.mock('react-native-unistyles', () =>
  mockUnistyles((require('react') as typeof import('react')).createElement),
)

export {}
