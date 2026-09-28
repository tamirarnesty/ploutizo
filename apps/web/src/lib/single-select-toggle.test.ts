import { describe, expect, it, vi } from 'vitest';
import { singleSelectToggle } from '@/lib/single-select-toggle';

const isFruit = (value: string): value is 'apple' | 'pear' =>
  value === 'apple' || value === 'pear';

describe('singleSelectToggle', () => {
  it('selects the newly pressed option', () => {
    const onSelect = vi.fn();
    singleSelectToggle(isFruit, onSelect)(['pear']);
    expect(onSelect).toHaveBeenCalledWith('pear');
  });

  it('keeps the current option when it is pressed again', () => {
    const onSelect = vi.fn();
    singleSelectToggle(isFruit, onSelect)([]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores values that are not options', () => {
    const onSelect = vi.fn();
    singleSelectToggle(isFruit, onSelect)(['plum']);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
