import { toJsonString } from 'curlconverter'
import { badRequest } from '~~/server/utils/errors'
import { HttpMethod } from '~~/shared/constants'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.curl || typeof body.curl !== 'string') {
    badRequest('cURL command is required')
  }

  try {
    const jsonString = toJsonString(body.curl)
    const parsed = JSON.parse(jsonString)

    return {
      data: {
        url: parsed.url || '',
        method: parsed.method?.toUpperCase() || HttpMethod.GET,
        headers: parsed.headers || null,
        body: parsed.data || parsed.json || null
      }
    }
  } catch (err) {
    badRequest(err instanceof Error ? err.message : 'Failed to parse cURL command')
  }
})
