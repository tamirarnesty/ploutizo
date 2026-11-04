/** OPFS file for the PLO-134 proof. Not scoped by member or household. */
export const SPIKE_DATABASE_NAME = 'ploutizo-persistence-spike.sqlite';

/** Shared by every tab that opens {@link SPIKE_DATABASE_NAME}. */
export const SPIKE_COORDINATOR_NAME = 'ploutizo-persistence-spike';

/**
 * Stable SQLite collection id. A random id would abandon the rows on reload.
 * Synced collections also read this from the query collection options.
 */
export const SPIKE_ACCOUNTS_COLLECTION_ID = 'accounts';
