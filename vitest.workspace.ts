import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/api',
  'apps/web',
  'packages/db',
  'packages/validators',
  'packages/types',
  'packages/utils',
  'packages/ui',
])
