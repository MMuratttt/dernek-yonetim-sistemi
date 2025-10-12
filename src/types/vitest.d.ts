// Augment vitest types instead of replacing them. The previous version
// replaced the module and removed built-in exports like beforeEach.
// We re-export the original types so TypeScript can pick them up.
import type {
  describe,
  it,
  test,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest'

export {
  describe,
  it,
  test,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
}

// If you need custom globals, declare them here via declare global {}
