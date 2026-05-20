import type { Mock } from 'vitest';

/** Narrow shape for mocks passed to `db.transaction` callbacks in API tests. */
export type MockDbTransactionClient = {
  insert: Mock;
  delete: Mock;
  update: Mock;
};
