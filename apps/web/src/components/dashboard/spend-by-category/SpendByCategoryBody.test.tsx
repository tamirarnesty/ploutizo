import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { SpendByCategoryBody } from '@/components/dashboard/spend-by-category/SpendByCategoryBody';

describe('SpendByCategoryBody', () => {
  it('renders a bar chart when categories have spend', () => {
    const { container } = render(
      <TooltipProvider delay={0}>
        <SpendByCategoryBody
          categories={[
            {
              categoryId: 'cat_a',
              name: 'Groceries',
              colour: 'green-500',
              amountCents: 1000,
              shareOfPeriod: 1,
              priorAmountCents: 500,
            },
          ]}
        />
      </TooltipProvider>
    );
    expect(screen.queryByText('No spend this period')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it('renders the empty state when there is no category spend', () => {
    render(<SpendByCategoryBody categories={[]} />);
    expect(screen.getByText('No spend this period')).toBeInTheDocument();
  });
});
