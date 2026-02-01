/**
 * cURL 範例，用於開發測試
 */

export const curlExamples = {
  // POST with JSON body
  postWithBody: `curl 'https://api.example.com/v1/users' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \\
  -H 'Accept: application/json' \\
  --data-raw '{"name":"John Doe","email":"john@example.com","age":30}'`,

  // GET with query params
  getWithParams: `curl 'https://api.example.com/v1/products?page=1&limit=10&sort=created_at' \\
  -H 'Accept: application/json' \\
  -H 'X-API-Key: sk_test_abc123'`,

  // PUT update
  putUpdate: `curl 'https://api.example.com/v1/orders/12345' \\
  -X PUT \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token123' \\
  --data-raw '{"status":"shipped","trackingNumber":"TRK-987654"}'`,

  // DELETE request
  deleteRequest: `curl 'https://api.example.com/v1/comments/999' \\
  -X DELETE \\
  -H 'Authorization: Bearer token123'`,

  // Complex POST with many headers
  complexPost: `curl 'https://insights-api.example.com/ReportMgmt/Companies/QueryAll' \\
  -H 'accept: application/json, text/plain, */*' \\
  -H 'accept-language: zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7' \\
  -H 'authorization: Bearer eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIn0...' \\
  -H 'content-type: application/json' \\
  -H 'origin: https://insights.example.com' \\
  -H 'referer: https://insights.example.com/' \\
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \\
  --data-raw '{"queryType":1,"term":"","pageNumber":1,"pageSize":10}'`
} as const

export type CurlExampleKey = keyof typeof curlExamples
