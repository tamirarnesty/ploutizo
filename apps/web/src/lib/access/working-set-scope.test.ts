import './working-set-cleanup';
import { afterEach, describe, expect, it } from 'vitest';
import {
  beginWorkingSetScope,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';

describe('beginWorkingSetScope', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
  });

  it('stays current until the active working set is replaced', () => {
    const scope = beginWorkingSetScope();
    expect(scope.isCurrent()).toBe(true);
    replaceActiveWorkingSet();
    expect(scope.isCurrent()).toBe(false);
  });
});
