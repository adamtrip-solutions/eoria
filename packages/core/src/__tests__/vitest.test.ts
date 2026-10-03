import { isValidElement } from 'react'

// Vitest is not installed here, so stand in for `vi.mock` and keep what it is given.
const mockRegistered: Record<string, () => unknown> = {}
jest.mock(
  'vitest',
  () => ({
    vi: {
      mock: (id: string, factory: () => unknown) => {
        mockRegistered[id] = factory
      },
    },
  }),
  { virtual: true },
)

type UnistylesMock = {
  StyleSheet: {
    create: (input: unknown) => { useVariants: (selection: object) => Record<string, unknown> }
  }
  withUnistyles: (component: string) => (props: object) => unknown
}

beforeAll(() => {
  jest.requireActual('../vitest')
})

it('registers the shared Unistyles and Nitro mocks with vi.mock', () => {
  expect(Object.keys(mockRegistered).sort()).toEqual([
    'react-native-nitro-modules',
    'react-native-unistyles',
  ])

  const unistyles = mockRegistered['react-native-unistyles']!() as UnistylesMock
  // The same module the Jest setup file registers, key for key.
  expect(Object.keys(unistyles).sort()).toEqual(
    Object.keys(jest.requireMock('react-native-unistyles')).sort(),
  )
  const sheet = unistyles.StyleSheet.create({
    root: { height: 1, variants: { size: { sm: { height: 2 } } } },
  })
  expect(sheet.useVariants({ size: 'sm' }).root).toEqual({ height: 2 })
  expect(isValidElement(unistyles.withUnistyles('View')({}))).toBe(true)

  const nitro = mockRegistered['react-native-nitro-modules']!() as {
    NitroModules: { createHybridObject: () => unknown }
  }
  expect(nitro.NitroModules.createHybridObject()).toHaveProperty('createHybridStatusBar')
})
