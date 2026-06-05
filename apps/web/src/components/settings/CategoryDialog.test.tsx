import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryDialog } from '@/components/settings/CategoryDialog';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import type { Category } from '@/lib/data-access/categories';

vi.mock('@/components/settings/CategoryForm', () => ({
  CategoryForm: () => <div data-testid="category-form" />,
}));

const mockCategory: Category = {
  id: 'cat-1',
  orgId: 'org-1',
  name: 'Groceries',
  icon: 'shopping-cart',
  colour: 'green-500',
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CategoryDialog overlay contract', () => {
  it('keeps dialog mounted when closed with category still set', () => {
    const { container } = render(
      <CategoryDialog
        open={false}
        onOpenChange={vi.fn()}
        category={mockCategory}
      />
    );

    expectOverlayMounted(container, 'dialog');
    expect(screen.getByTestId('category-form')).toBeInTheDocument();
    expect(screen.getByText('Edit category')).toBeInTheDocument();
  });
});
