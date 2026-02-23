# Local Login Flow (API 方案)

## 1. 先決條件

- 本機可啟動專案：`pnpm dev`
- `.env` 至少有：
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `DATABASE_URL`
- 需要一組可登入的測試帳號：
  - Supabase Auth 有該 user
  - `public.profiles` 有對應 `user.id`（否則會被導向 `/register`）

## 2. Dev Login API（已改為 API）

- 路徑：`GET /api/dev/login`
- 用途：在 local 開發環境直接做 server-side `signInWithPassword`，再導向目標頁
- 只在 dev mode 開放；production 會拒絕

Query 參數：

- `redirect`：登入成功後導向位置（必須以 `/` 開頭，預設 `/`）
- `key`：可選；若 server 有設定 `DEV_LOGIN_KEY`，就必須提供且一致

## 3. 環境變數

### 3.1 Server 端（Nuxt runtimeConfig）

- `DEV_LOGIN_EMAIL`（必填）
- `DEV_LOGIN_PASSWORD`（必填）
- `DEV_LOGIN_KEY`（選填，但建議設定）

> `DEV_LOGIN_EMAIL` / `DEV_LOGIN_PASSWORD` 是 API 實際拿來登入 Supabase 的帳密。

### 3.2 agent-browser 登入腳本參數（選填）

- `BASE_URL`（預設 `http://localhost:3000`）
- `DEV_LOGIN_API_PATH`（預設 `/api/dev/login`）
- `DEV_LOGIN_PROTECTED_PATH`（預設 `/`）
- `AGENT_BROWSER_SESSION`（預設 `dev-login`）
- `DEV_LOGIN_WAIT_MS`（預設 `1200`）
- `DEV_LOGIN_SCREENSHOT_PATH`（預設 `/tmp/curl-ticket-logged-in.png`）
- `DEV_LOGIN_KEY`（若有設定 server key，這裡要帶同一個值）

## 4. 手動建立測試帳號（Supabase）

### 4.1 建立 Auth 使用者（Dashboard）

1. 進入 `Authentication -> Users`
2. 新增測試使用者（email/password）
3. 確認該帳號已 `confirmed`

### 4.2 建立/更新 profiles 對應資料（SQL Editor）

```sql
insert into public.profiles (id, email, name, role)
select id, email, 'Dev Login User', 'user'
from auth.users
where email = 'dev@mail.com'
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    updated_at = now();
```

### 4.3 驗證結果

```sql
select u.id, u.email, p.role, p.name
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'dev@mail.com';
```

## 5. 執行登入流程

先啟動 Nuxt：

```bash
pnpm dev
```

再執行登入腳本：

```bash
DEV_LOGIN_KEY="local-dev-key" \
DEV_LOGIN_PROTECTED_PATH="/projects/6afd7ecf-7fa1-47cc-aa64-594c445ba164" \
pnpm dev:login
```

如果你沒有設定 server 的 `DEV_LOGIN_KEY`，可省略 `DEV_LOGIN_KEY`：

```bash
DEV_LOGIN_PROTECTED_PATH="/projects/6afd7ecf-7fa1-47cc-aa64-594c445ba164" \
pnpm dev:login
```

## 6. agent-browser 具體步驟

`pnpm dev:login` 會：

1. 開啟 `/login` 初始化 origin
2. 清除 cookies
3. 清除 localStorage
4. 清除 sessionStorage
5. 開啟 `/api/dev/login?...`（API 會登入並 redirect）
6. 開啟受保護頁
7. 輸出當前 URL
8. 輸出 screenshot + `snapshot -i`

`pnpm dev:login-required` 會驗證未登入狀態：

1. 清除 cookies/storage
2. 開受保護頁
3. 確認被導回 `/login`
4. 輸出 screenshot + snapshot

## 7. 截圖位置

- 登入成功（`dev:login`）預設：`/tmp/curl-ticket-logged-in.png`
- 未登入驗證（`dev:login-required`）預設：`/tmp/curl-ticket-login-required.png`

macOS 上 `/tmp` 通常對應 `/private/tmp`。

## 8. 安全建議

- `DEV_LOGIN_EMAIL` / `DEV_LOGIN_PASSWORD` / `DEV_LOGIN_KEY` 不要 commit
- 使用專用測試帳號，不要用正式個人帳號
- API 僅限 local 開發使用

## 9. 常見錯誤

### 9.1 `Invalid dev login key`

- server 設了 `DEV_LOGIN_KEY`，但腳本沒帶或值不一致

### 9.2 `DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD is not configured`

- 缺少 server 端登入帳密

### 9.3 登入後仍被導向 `/register`

- auth user 存在，但 `public.profiles` 沒有對應資料
