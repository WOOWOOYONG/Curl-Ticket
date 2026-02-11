import { HttpStatus } from '~~/server/constants'

type ErrorData = Record<string, unknown> | unknown

export function badRequest(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HttpStatus.BadRequest,
    statusMessage: message,
    data
  })
}

export function forbidden(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HttpStatus.Forbidden,
    statusMessage: message,
    data
  })
}

export function notFound(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HttpStatus.NotFound,
    statusMessage: message,
    data
  })
}

export function internalServerError(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HttpStatus.InternalServerError,
    statusMessage: message,
    data
  })
}
