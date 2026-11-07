import { describe, expect, it } from 'vitest';
import {
  deriveReviewPersistence,
  getReviewPersistenceRowPhase,
  initialReviewPersistenceState,
  reduceReviewPersistence,
} from './reviewPersistenceReducer';
import type {
  ReviewPersistenceEvent,
  ReviewPersistenceRow,
  ReviewPersistenceRowPhase,
  ReviewPersistenceState,
} from './reviewPersistenceReducer';

const ROW = 'row_a';
const OTHER = 'row_b';

const row = (partial: Partial<ReviewPersistenceRow>): ReviewPersistenceRow => ({
  pending: false,
  inFlight: 0,
  failedKeys: [],
  ...partial,
});

const stateWith = (
  rowState: ReviewPersistenceRow | undefined,
  hasSaved = false
): ReviewPersistenceState => ({
  rows: new Map(rowState ? [[ROW, rowState]] : []),
  hasSaved,
});

const rowOf = (state: ReviewPersistenceState) => state.rows.get(ROW);

const states: Record<string, ReviewPersistenceRow | undefined> = {
  clean: undefined,
  pending: row({ pending: true }),
  in_flight: row({ inFlight: 1 }),
  failed: row({ failedKeys: ['reviewDescription', 'reviewAmount'] }),
  in_flight_and_pending: row({ pending: true, inFlight: 1 }),
  in_flight_and_failed: row({
    inFlight: 1,
    failedKeys: ['reviewDescription', 'reviewAmount'],
  }),
};

const events: Record<string, ReviewPersistenceEvent> = {
  edited: { type: 'edited', rowId: ROW },
  edits_dropped: { type: 'edits_dropped', rowIds: [ROW] },
  persist_started: { type: 'persist_started', rowIds: [ROW] },
  persist_succeeded_some_keys: {
    type: 'persist_succeeded',
    entries: [{ rowId: ROW, succeededKeys: ['reviewDescription'] }],
  },
  persist_succeeded_all: {
    type: 'persist_succeeded',
    entries: [{ rowId: ROW }],
  },
  persist_failed: {
    type: 'persist_failed',
    entries: [{ rowId: ROW, fieldKeys: ['reviewAmount', 'reviewNotes'] }],
  },
};

type Expected = Partial<ReviewPersistenceRow> | 'clean';

/** Every event from every state. Omitted fields keep the starting value. */
const table: Record<string, Record<string, Expected>> = {
  clean: {
    edited: { pending: true },
    edits_dropped: 'clean',
    persist_started: { inFlight: 1 },
    persist_succeeded_some_keys: 'clean',
    persist_succeeded_all: 'clean',
    persist_failed: { failedKeys: ['reviewAmount', 'reviewNotes'] },
  },
  pending: {
    edited: {},
    edits_dropped: 'clean',
    persist_started: { pending: false, inFlight: 1 },
    persist_succeeded_some_keys: {},
    persist_succeeded_all: {},
    persist_failed: { failedKeys: ['reviewAmount', 'reviewNotes'] },
  },
  in_flight: {
    edited: { pending: true },
    edits_dropped: {},
    persist_started: { inFlight: 2 },
    persist_succeeded_some_keys: 'clean',
    persist_succeeded_all: 'clean',
    persist_failed: {
      inFlight: 0,
      failedKeys: ['reviewAmount', 'reviewNotes'],
    },
  },
  failed: {
    edited: { pending: true },
    edits_dropped: {},
    persist_started: { inFlight: 1 },
    persist_succeeded_some_keys: { failedKeys: ['reviewAmount'] },
    persist_succeeded_all: 'clean',
    persist_failed: {
      failedKeys: ['reviewDescription', 'reviewAmount', 'reviewNotes'],
    },
  },
  in_flight_and_pending: {
    edited: {},
    edits_dropped: { pending: false },
    persist_started: { pending: false, inFlight: 2 },
    persist_succeeded_some_keys: { inFlight: 0 },
    persist_succeeded_all: { inFlight: 0 },
    persist_failed: {
      inFlight: 0,
      failedKeys: ['reviewAmount', 'reviewNotes'],
    },
  },
  in_flight_and_failed: {
    edited: { pending: true },
    edits_dropped: {},
    persist_started: { inFlight: 2 },
    persist_succeeded_some_keys: { inFlight: 0, failedKeys: ['reviewAmount'] },
    persist_succeeded_all: 'clean',
    persist_failed: {
      inFlight: 0,
      failedKeys: ['reviewDescription', 'reviewAmount', 'reviewNotes'],
    },
  },
};

describe('reduceReviewPersistence transition table', () => {
  for (const [stateName, start] of Object.entries(states)) {
    for (const [eventName, event] of Object.entries(events)) {
      it(`${stateName} + ${eventName}`, () => {
        const expected = table[stateName][eventName];
        const next = reduceReviewPersistence(stateWith(start), event);

        if (expected === 'clean') {
          expect(rowOf(next)).toBeUndefined();
        } else {
          expect(rowOf(next)).toEqual({ ...(start ?? row({})), ...expected });
        }
      });
    }
  }

  it('does not mutate the previous state', () => {
    const start = stateWith(row({ pending: true }));
    reduceReviewPersistence(start, events.persist_started);
    expect(rowOf(start)).toEqual(row({ pending: true }));
  });

  it('returns the same state when nothing changed', () => {
    const start = stateWith(row({ pending: true }));
    expect(reduceReviewPersistence(start, events.edited)).toBe(start);
    expect(
      reduceReviewPersistence(
        initialReviewPersistenceState,
        events.edits_dropped
      )
    ).toBe(initialReviewPersistenceState);
  });

  it('only touches rows named by the event', () => {
    const start: ReviewPersistenceState = {
      rows: new Map([
        [ROW, row({ pending: true })],
        [OTHER, row({ failedKeys: ['reviewNotes'] })],
      ]),
      hasSaved: false,
    };
    const next = reduceReviewPersistence(start, events.persist_started);
    expect(next.rows.get(OTHER)).toEqual(row({ failedKeys: ['reviewNotes'] }));
  });

  it('sets hasSaved on any success and never clears it', () => {
    const afterSuccess = reduceReviewPersistence(
      initialReviewPersistenceState,
      events.persist_succeeded_all
    );
    expect(afterSuccess.hasSaved).toBe(true);
    expect(
      reduceReviewPersistence(afterSuccess, events.persist_failed).hasSaved
    ).toBe(true);
  });
});

describe('getReviewPersistenceRowPhase', () => {
  const cases: [string, ReviewPersistenceRowPhase][] = [
    ['clean', 'clean'],
    ['pending', 'pending'],
    ['in_flight', 'in_flight'],
    ['failed', 'failed'],
    ['in_flight_and_pending', 'pending'],
    ['in_flight_and_failed', 'in_flight'],
  ];

  it.each(cases)('%s is %s', (stateName, phase) => {
    expect(getReviewPersistenceRowPhase(states[stateName] ?? row({}))).toBe(
      phase
    );
  });
});

describe('deriveReviewPersistence', () => {
  it('is idle for an untouched draft', () => {
    expect(deriveReviewPersistence(initialReviewPersistenceState)).toEqual({
      status: 'idle',
      failedRowIds: [],
      hasUnsavedWork: false,
      failedFieldKeys: new Map(),
    });
  });

  it.each([
    ['pending', 'saving', true],
    ['in_flight', 'saving', true],
    ['failed', 'failed', true],
    ['in_flight_and_failed', 'saving', true],
  ] as const)('a %s row makes the draft %s', (stateName, status, unsaved) => {
    const snapshot = deriveReviewPersistence(stateWith(states[stateName]));
    expect(snapshot.status).toBe(status);
    expect(snapshot.hasUnsavedWork).toBe(unsaved);
  });

  it('is saved once a save succeeded and no row needs work', () => {
    const snapshot = deriveReviewPersistence(stateWith(undefined, true));
    expect(snapshot.status).toBe('saved');
    expect(snapshot.hasUnsavedWork).toBe(false);
  });

  it('lists failed rows with their field keys, even while another save is in flight', () => {
    const snapshot = deriveReviewPersistence(
      stateWith(states.in_flight_and_failed)
    );
    expect(snapshot.failedRowIds).toEqual([ROW]);
    expect(snapshot.failedFieldKeys.get(ROW)).toEqual([
      'reviewDescription',
      'reviewAmount',
    ]);
  });

  it('a later successful save of other fields does not hide an earlier failed field', () => {
    const failed = reduceReviewPersistence(
      reduceReviewPersistence(initialReviewPersistenceState, {
        type: 'persist_started',
        rowIds: [ROW],
      }),
      {
        type: 'persist_failed',
        entries: [{ rowId: ROW, fieldKeys: ['reviewDescription'] }],
      }
    );
    const afterLaterSave = reduceReviewPersistence(
      reduceReviewPersistence(failed, {
        type: 'persist_started',
        rowIds: [ROW],
      }),
      {
        type: 'persist_succeeded',
        entries: [{ rowId: ROW, succeededKeys: ['reviewAmount'] }],
      }
    );
    const snapshot = deriveReviewPersistence(afterLaterSave);
    expect(snapshot.status).toBe('failed');
    expect(snapshot.failedFieldKeys.get(ROW)).toEqual(['reviewDescription']);
  });

  it('stays saving until every overlapping save finishes, and keeps a failed field', () => {
    const overlapping = reduceReviewPersistence(
      reduceReviewPersistence(initialReviewPersistenceState, {
        type: 'persist_started',
        rowIds: [ROW],
      }),
      { type: 'persist_started', rowIds: [ROW] }
    );

    const afterFailure = reduceReviewPersistence(overlapping, {
      type: 'persist_failed',
      entries: [{ rowId: ROW, fieldKeys: ['reviewDescription'] }],
    });
    const whileOtherSaveRuns = deriveReviewPersistence(afterFailure);
    expect(whileOtherSaveRuns.status).toBe('saving');
    expect(whileOtherSaveRuns.failedFieldKeys.get(ROW)).toEqual([
      'reviewDescription',
    ]);

    const settled = deriveReviewPersistence(
      reduceReviewPersistence(afterFailure, {
        type: 'persist_succeeded',
        entries: [{ rowId: ROW, succeededKeys: ['reviewAmount'] }],
      })
    );
    expect(settled.status).toBe('failed');
    expect(settled.failedFieldKeys.get(ROW)).toEqual(['reviewDescription']);
  });
});
