import { resolvePublicIssue } from '~~/server/utils/public-sharing'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const token = getRouterParam(event, 'token')

  return {
    data: await resolvePublicIssue(useDB(), token)
  }
})
