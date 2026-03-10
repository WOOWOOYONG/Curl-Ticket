---
name: curl-ticket-issue-analyzer
description: >
  Curl Ticket issue 分析工具。當使用者提到 issue、bug、ticket、錯誤、
  Curl Ticket、CT-（如 CT-42）、問題追蹤時自動觸發，
  協助從 issue 資訊定位本地 codebase 的問題程式碼。
user-invocable: false
---

# Curl Ticket Issue 分析

## 可用指令

```
curl-ticket projects                              # 列出可存取的專案
curl-ticket issues <projectId> [-s Open] [-t api_bug] [-n 10]  # 列出 issue
curl-ticket issue <projectId> <issueId|CT-42>     # 取得 issue 詳情
curl-ticket update-status <projectId> <issueId> <Open|in-progress|Done|Close>
```

首次執行會自動啟動瀏覽器登入，不需額外設定。

## 分析流程

1. 先用 `curl-ticket projects` 確認 projectId
2. 用 `curl-ticket issues <projectId> -s Open` 列出待處理 issue
3. 選擇要分析的 issue，用 `curl-ticket issue <projectId> <issueId>` 取得詳情
4. 根據 issue 類型分析：
   - **API Bug**：從「端點」欄位（如 `POST /api/users`）搜尋對應的 route handler
   - **Task**：從 title 和 description 搜尋相關程式碼
5. 根據回應狀態碼判斷方向：
   - 4xx → 檢查驗證邏輯、權限控制、資源是否存在
   - 5xx → 追蹤程式邏輯錯誤、DB query 問題
6. 搜尋「錯誤訊息」中的關鍵字，用 grep 定位出錯位置
7. 追蹤完整請求鏈：路由 → middleware → handler → 業務邏輯 → DB query
8. 找到問題後提供修復建議，修復完成可用 `update-status` 更新狀態

## 注意事項

- 使用 `-s Open` 過濾，避免載入已完成的 issue
- 一次只深入分析 1-2 筆 issue，避免 context 過載
- Task 類型沒有 API 端點資訊，改從 title 和描述搜尋相關程式碼
- issue 詳情中的 cURL 已自動移除無關 header，可直接參考
- 錯誤訊息已從 responseBody 自動提取，是最重要的線索
