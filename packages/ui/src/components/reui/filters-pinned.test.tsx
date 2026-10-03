/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/button';
import {
  type FilterFieldConfig,
  Filters,
  isFilterValueActive,
} from '@/components/reui/filters';

afterEach(() => {
  cleanup();
});

const fields: FilterFieldConfig<string>[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [{ value: 'expense', label: 'Expense' }],
  },
  {
    key: 'assigneeId',
    label: 'Assignee',
    type: 'select',
    options: [{ value: 'm1', label: 'Member' }],
  },
];

describe('isFilterValueActive', () => {
  it('treats empty and not_empty operators as active without values', () => {
    expect(
      isFilterValueActive({
        id: '1',
        field: 'categoryId',
        operator: 'empty',
        values: [],
      })
    ).toBe(true);
  });

  it('is inactive when there are no values for value-based operators', () => {
    expect(
      isFilterValueActive({
        id: '1',
        field: 'type',
        operator: 'is',
        values: [],
      })
    ).toBe(false);
  });
});

describe('Filters pinnedFieldKeys', () => {
  it('always renders pinned field labels even when no filters are set', () => {
    render(
      <Filters
        filters={[]}
        fields={fields}
        onChange={vi.fn()}
        pinnedFieldKeys={['type']}
        trigger={
          <Button variant="outline" size="sm">
            Filters
          </Button>
        }
      />
    );

    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.queryByText('Assignee')).toBeNull();
  });

  it('does not duplicate pinned filters in the chip list', () => {
    render(
      <Filters
        filters={[
          {
            id: 'filter-type',
            field: 'type',
            operator: 'is',
            values: ['expense'],
          },
        ]}
        fields={fields}
        onChange={vi.fn()}
        pinnedFieldKeys={['type']}
        trigger={
          <Button variant="outline" size="sm">
            Filters
          </Button>
        }
      />
    );

    expect(screen.getAllByText('Type')).toHaveLength(1);
  });
});
