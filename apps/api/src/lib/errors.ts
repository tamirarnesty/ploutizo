// Domain error classes for centralized HTTP error mapping via app.onError().
// Services throw these; the onError handler in index.ts maps them to responses.
// Per D-03, D-04.

export class DomainError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(404, message)
    this.name = 'NotFoundError'
  }
}
