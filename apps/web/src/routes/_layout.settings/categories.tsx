import { createFileRoute } from '@tanstack/react-router'
import { CategoriesSettings } from '../../components/settings/CategoriesSettings'

export const Route = createFileRoute('/_layout/settings/categories')({
  component: CategoriesSettings,
})
