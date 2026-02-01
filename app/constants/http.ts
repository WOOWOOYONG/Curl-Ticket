import { HttpMethod, type HttpMethod as HttpMethodType } from '~~/shared/constants'

// UBadge 組件支援的顏色類型
type BadgeColor = 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

// HTTP 方法對應的顏色（用於 UBadge 組件）
export const HttpMethodColor: Record<HttpMethodType, BadgeColor> = {
  [HttpMethod.GET]: 'success',
  [HttpMethod.POST]: 'primary',
  [HttpMethod.PUT]: 'warning',
  [HttpMethod.PATCH]: 'warning',
  [HttpMethod.DELETE]: 'error',
  [HttpMethod.HEAD]: 'neutral',
  [HttpMethod.OPTIONS]: 'neutral'
} as const

export function getHttpMethodColor(method: string): BadgeColor {
  return HttpMethodColor[method as HttpMethodType] ?? 'warning'
}
