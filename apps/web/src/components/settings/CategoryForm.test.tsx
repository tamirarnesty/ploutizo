import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColourToken } from '@ploutizo/types';
import type { Category } from '@ploutizo/validators';
import { CategoryForm } from '@/components/settings/CategoryForm';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  categories: [] as Category[],
}));

vi.mock('@/lib/data-access/categories', () => ({
  useCreateCategory: () => ({ mutate: mocks.createMutate }),
  useUpdateCategory: () => ({ mutate: mocks.updateMutate }),
  useGetCategories: () => ({ data: mocks.categories }),
}));

vi.mock('@/components/categories/LucideIconPicker', () => ({
  LucideIconPicker: () => null,
}));

// The picker has its own tests; here it only reports the form's colour value.
vi.mock('@/components/colour/ColourTokenPicker', () => ({
  ColourTokenPicker: ({ value }: { value: ColourToken }) => (
    <output aria-label="Selected colour">{value}</output>
  ),
}));

const category = (id: string, colour: ColourToken): Category => ({
  id,
  orgId: 'org_1',
  name: id,
  icon: null,
  colour,
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categories = [
      category('cat_1', 'red-500'),
      category('cat_2', 'orange-500'),
    ];
  });

  it('preselects the first colour no other category uses when creating', async () => {
    const user = userEvent.setup();
    render(<CategoryForm category={null} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Selected colour')).toHaveTextContent(
      'amber-500'
    );

    await user.type(screen.getByLabelText('Name'), 'Pets');
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Pets', icon: undefined, colour: 'amber-500' },
      expect.anything()
    );
  });

  it("keeps the category's own colour when editing", () => {
    render(
      <CategoryForm
        category={category('cat_2', 'orange-500')}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Selected colour')).toHaveTextContent(
      'orange-500'
    );
  });
});
