export class HttpsError extends Error {
  status: number

  constructor(status = 500, ...params: any[]) {
    super(...params)

    if (Error.captureStackTrace) Error.captureStackTrace(this, HttpsError)

    this.name = 'HttpsError'
    this.status = status
  }
}
