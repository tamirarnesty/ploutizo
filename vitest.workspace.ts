import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/api',
  'packages/db',
  'packages/validators',
  'packages/types',
])
