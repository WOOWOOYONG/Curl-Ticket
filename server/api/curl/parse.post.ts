import { toJsonString } from 'curlconverter'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.curl || typeof body.curl !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'cURL command is required'
    })
  }

  try {
    const jsonString = toJsonString(body.curl)
    const parsed = JSON.parse(jsonString)

    return {
      data: {
        url: parsed.url || '',
        method: parsed.method?.toUpperCase() || 'GET',
        headers: parsed.headers || null,
        body: parsed.data || parsed.json || null
      }
    }
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof Error ? err.message : 'Failed to parse cURL command'
    })
  }
})
