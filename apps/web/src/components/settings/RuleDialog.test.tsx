import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RuleDialog } from '@/components/settings/RuleDialog';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';

vi.mock('@/components/settings/RuleForm', () => ({
  RuleForm: () => <div data-testid="rule-form" />,
}));

const mockRule: MerchantRule = {
  id: 'rule-1',
  orgId: 'org-1',
  pattern: 'AMZN',
  matchType: 'contains',
  renameTo: null,
  categoryId: 'cat-1',
  assigneeId: null,
  priority: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('RuleDialog overlay contract', () => {
  it('keeps dialog mounted when closed with rule still set', () => {
    const { container } = render(
      <RuleDialog open={false} onOpenChange={vi.fn()} rule={mockRule} />
    );

    expectOverlayMounted(container, 'dialog');
    expect(screen.getByTestId('rule-form')).toBeInTheDocument();
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });
});
