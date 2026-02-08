import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND
} from '~~/server/constants'

type ErrorData = Record<string, unknown> | unknown

export function badRequest(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HTTP_BAD_REQUEST,
    statusMessage: message,
    data
  })
}

export function forbidden(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HTTP_FORBIDDEN,
    statusMessage: message,
    data
  })
}

export function notFound(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HTTP_NOT_FOUND,
    statusMessage: message,
    data
  })
}

export function internalServerError(message: string, data?: ErrorData): never {
  throw createError({
    statusCode: HTTP_INTERNAL_SERVER_ERROR,
    statusMessage: message,
    data
  })
}
