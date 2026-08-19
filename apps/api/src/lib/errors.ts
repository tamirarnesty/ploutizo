// Domain error classes for centralized HTTP error mapping via app.onError().
// Services throw these; the onError handler in index.ts maps them to responses.
// Per D-03, D-04.

export class DomainError<TDetails = unknown> extends Error {
  constructor(
    public statusCode: number,
    message: string,
    /** Optional machine-readable code included in the error response (defaults to 'DOMAIN_ERROR'). */
    public code?: string,
    /** Optional structured payload for clients (e.g. per-row Continue blockers). */
    public details?: TDetails
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
