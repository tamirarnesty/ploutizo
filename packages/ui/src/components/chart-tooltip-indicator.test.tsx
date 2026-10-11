/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { type TooltipPayloadEntry } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/chart';

const payload: TooltipPayloadEntry[] = [
  {
    dataKey: 'current',
    name: 'current',
    value: 1200,
    color: 'var(--color-current)',
    payload: { key: 'groceries' },
    graphicalItemId: 'bar-current',
  },
  {
    dataKey: 'prior',
    name: 'prior',
    value: 900,
    color: 'var(--color-prior)',
    payload: { key: 'groceries' },
    graphicalItemId: 'bar-prior',
  },
];

const renderTooltip = (
  indicatorColor?: (item: TooltipPayloadEntry) => string | undefined
) => {
  const { container } = render(
    <ChartContainer
      config={{ current: { label: 'Now' }, prior: { label: 'Before' } }}
    >
      <ChartTooltipContent
        active
        payload={payload}
        indicatorColor={indicatorColor}
      />
    </ChartContainer>
  );
  return [...container.querySelectorAll<HTMLElement>('.shrink-0')].map((dot) =>
    dot.style.getPropertyValue('--color-bg')
  );
};

describe('ChartTooltipContent indicatorColor', () => {
  beforeAll(() => {
    // jsdom lays nothing out, and Recharts' ResponsiveContainer renders nothing it measures at 0×0.
    const measure = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('recharts-responsive-container')
          ? DOMRect.fromRect({ width: 320, height: 200 })
          : measure.call(this);
      }
    );
    // It also observes its size, and jsdom has no ResizeObserver.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('paints each dot with the colour the resolver returns for its item', () => {
    expect(
      renderTooltip((item) => (item.dataKey === 'current' ? 'red' : 'blue'))
    ).toEqual(['red', 'blue']);
  });

  it('falls back to the series colour where the resolver returns nothing', () => {
    expect(
      renderTooltip((item) => (item.dataKey === 'prior' ? 'blue' : undefined))
    ).toEqual(['var(--color-current)', 'blue']);
  });

  it('paints dots with the series colour without a resolver', () => {
    expect(renderTooltip()).toEqual([
      'var(--color-current)',
      'var(--color-prior)',
    ]);
  });
});
