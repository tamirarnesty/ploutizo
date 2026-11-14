# Web tests

Tests in this package assert **behaviour given conditions**, not styling and not the presence or absence of files or components.

Examples of the right shape:

- Given a list payload that omits a money total, the UI does not present `$0.00` as a verified sum; a loaded empty set may still show `$0.00`. See `presentVerifiedMoneyCents` / `formatVerifiedCurrency` in `@ploutizo/utils`.
- Given a submit or discard is in flight, a second click does not start another mutation (or the action is not operable).
- After a successful save, the list (or other visible state) reflects the new data once the mutation settles.
- Given a dialog or sheet is open, it has an accessible name (`expectOpenOverlayNamed` in `behaviour.ts`).

Do not assert classNames, computed styles, or screenshots. A test that only checks a mock was called, or that the component rendered, is not a regression test.

`eslint-plugin-testing-library` (`prefer-user-event`, awaited finds, no container/node access) is how tests drive and query the UI. It does not replace the cases above and cannot require a second-click case on its own.

The overlay parent-state contract tests in `overlayParentState.contract.test.ts` are the model for extracting the behaviour under test and asserting outcomes after a close or open.

Entity-form submit buttons staying in a loading state until `mutateAsync` settles is covered by PLO-145; do not duplicate that hook change here.
