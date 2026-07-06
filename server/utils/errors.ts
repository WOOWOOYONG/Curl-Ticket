import { HttpStatus } from '~~/server/constants'

type ErrorData = Record<string, unknown> | unknown

/**
 * 統一的錯誤拋出：
 * - `statusMessage` 只放固定的 ASCII reason phrase（避免非 ASCII 進入 HTTP status line）
 * - 人類可讀訊息一律放 `message`（序列化到 response body），client 統一讀 `error.data.message`
 * - `data` 為給 client 的結構化附加資料（白名單，勿放 raw error）
 */
function throwHttpError(
  statusCode: number,
  reason: string,
  message: string,
  data?: ErrorData
): never {
  throw createError({
    statusCode,
    statusMessage: reason,
    message,
    data
  })
}

export function unauthorized(message: string, data?: ErrorData): never {
  throwHttpError(HttpStatus.Unauthorized, 'Unauthorized', message, data)
}

export function badRequest(message: string, data?: ErrorData): never {
  throwHttpError(HttpStatus.BadRequest, 'Bad Request', message, data)
}

export function forbidden(message: string, data?: ErrorData): never {
  throwHttpError(HttpStatus.Forbidden, 'Forbidden', message, data)
}

export function notFound(message: string, data?: ErrorData): never {
  throwHttpError(HttpStatus.NotFound, 'Not Found', message, data)
}

/**
 * 內部錯誤：絕不把 raw error 洩漏給 client。
 * 若有底層錯誤，傳入 `cause` 只做 server-side log。
 */
export function internalServerError(message: string, cause?: unknown): never {
  if (cause !== undefined) {
    console.error(`[internalServerError] ${message}`, cause)
  }
  throwHttpError(HttpStatus.InternalServerError, 'Internal Server Error', message)
}
