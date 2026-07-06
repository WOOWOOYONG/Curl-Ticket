import { toJsonString } from 'curlconverter'
import { badRequest } from '~~/server/utils/errors'
import { validateBody } from '~~/server/utils/validate'
import { HttpMethod } from '~~/shared/constants'
import { parseCurlSchema } from '~~/shared/schemas/curl'

export default defineEventHandler(async (event) => {
  const { curl } = await validateBody(event, parseCurlSchema)

  try {
    const jsonString = toJsonString(curl)
    const curlData = JSON.parse(jsonString)

    return {
      data: {
        url: curlData.raw_url || curlData.url || '',
        method: curlData.method?.toUpperCase() || HttpMethod.GET,
        headers: curlData.headers || null,
        body: curlData.data || curlData.json || null
      }
    }
  } catch {
    badRequest('Invalid cURL command')
  }
})
