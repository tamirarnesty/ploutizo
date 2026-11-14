import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Helpers for behaviour-given-conditions tests.
 *
 * Assert what the user or API can observe for a given condition.
 * Do not assert classNames, computed styles, screenshots, or that a
 * file or component still exists. See `README.md` in this folder and
 * `.cursor/rules/behaviour-tests.mdc`.
 */

type AccessibleRole = 'dialog' | 'alertdialog';

/** Given an overlay is open, it has the expected accessible name. */
export const expectOpenOverlayNamed = (
  name: string | RegExp,
  role: AccessibleRole = 'dialog'
) => {
  expect(screen.getByRole(role, { name })).toBeInTheDocument();
};
