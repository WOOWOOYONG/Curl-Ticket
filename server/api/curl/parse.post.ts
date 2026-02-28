import { toJsonString } from 'curlconverter'
import { badRequest } from '~~/server/utils/errors'
import { HttpMethod } from '~~/shared/constants'
import { parseCurlSchema } from '~~/shared/schemas/curl'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const parsed = parseCurlSchema.safeParse(body)
  if (!parsed.success) {
    badRequest('cURL command is required')
  }

  try {
    const jsonString = toJsonString(parsed.data.curl)
    const curlData = JSON.parse(jsonString)

    return {
      data: {
        url: curlData.url || '',
        method: curlData.method?.toUpperCase() || HttpMethod.GET,
        headers: curlData.headers || null,
        body: curlData.data || curlData.json || null
      }
    }
  } catch (err) {
    badRequest(err instanceof Error ? err.message : 'Failed to parse cURL command')
  }
})
