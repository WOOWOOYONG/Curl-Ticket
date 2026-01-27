# Nuxt 4 + Drizzle ORM 資料庫設定筆記

## 目錄

1. [什麼是 Drizzle ORM？](#1-什麼是-drizzle-orm)
2. [安裝套件](#2-安裝套件)
3. [專案結構](#3-專案結構)
4. [Schema 定義](#4-schema-定義)
5. [設定檔](#5-設定檔)
6. [常用指令](#6-常用指令)
7. [在 Nuxt API Routes 中使用](#7-在-nuxt-api-routes-中使用)
8. [常見問題](#8-常見問題)

---

## 1. 什麼是 Drizzle ORM？

**ORM (Object-Relational Mapping)** 是一種技術，讓你用程式語言的物件來操作資料庫，而不需要直接寫 SQL。

**Drizzle ORM** 是一個輕量、TypeScript-first 的 ORM，特點：
- 完整的 TypeScript 型別支援
- 接近原生 SQL 的語法，學習曲線低
- 支援 PostgreSQL, MySQL, SQLite
- 內建 migration 工具 (drizzle-kit)

```
傳統 SQL:
SELECT * FROM users WHERE id = 1;

Drizzle ORM:
db.select().from(users).where(eq(users.id, 1));
```

---

## 2. 安裝套件

```bash
# 安裝 Drizzle ORM 核心 + PostgreSQL 驅動程式
pnpm add drizzle-orm postgres

# 安裝 Drizzle Kit (CLI 工具，用於 migration)
pnpm add -D drizzle-kit
```

**套件說明：**
| 套件 | 用途 |
|-----|-----|
| `drizzle-orm` | ORM 核心，提供查詢 API |
| `postgres` | PostgreSQL 驅動程式（連接資料庫用） |
| `drizzle-kit` | CLI 工具，產生/執行 migration |

---

## 3. 專案結構

```
project-root/
├── .env                          # 環境變數（含 DATABASE_URL）
├── drizzle.config.ts             # Drizzle Kit 設定檔
├── shared/
│   └── constants.ts              # 前後端共用的常數與型別
└── server/
    ├── database/
    │   ├── schema/               # Schema 定義
    │   │   ├── projects.ts
    │   │   ├── issues.ts
    │   │   ├── notifications.ts
    │   │   └── index.ts          # 統一匯出
    │   ├── migrations/           # Migration 檔案（自動產生）
    │   └── index.ts              # Drizzle 客戶端（CLI 用）
    └── utils/
        └── db.ts                 # Nuxt server 專用的 DB 連線
```

---

## 4. Schema 定義

Schema 就是「資料表的結構定義」，告訴 Drizzle 你的資料表長什麼樣子。

### 4.1 基本範例：projects 表

```ts
// server/database/schema/projects.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  // 欄位名稱: 資料型別().限制條件()
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// 自動推導出的 TypeScript 型別
export type Project = typeof projects.$inferSelect  // 查詢結果的型別
export type NewProject = typeof projects.$inferInsert // 新增資料的型別
```

### 4.2 常用資料型別對照表

| Drizzle 型別 | PostgreSQL 型別 | 說明 |
|-------------|----------------|------|
| `uuid('column')` | UUID | 唯一識別碼 |
| `text('column')` | TEXT | 文字 |
| `integer('column')` | INTEGER | 整數 |
| `serial('column')` | SERIAL | 自動遞增整數 |
| `boolean('column')` | BOOLEAN | 布林值 |
| `timestamp('column')` | TIMESTAMP | 時間戳記 |
| `jsonb('column')` | JSONB | JSON 格式資料 |

### 4.3 常用限制條件

```ts
.primaryKey()      // 主鍵
.notNull()         // 不可為空
.unique()          // 唯一值
.default('value')  // 預設值
.defaultRandom()   // UUID 預設為隨機產生
.defaultNow()      // 時間預設為現在

// 外鍵關聯
.references(() => otherTable.id, { onDelete: 'cascade' })
```

### 4.4 進階：帶有外鍵的表（issues）

```ts
// server/database/schema/issues.ts
import { pgTable, uuid, text, serial, integer, jsonb } from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),

  // 外鍵：關聯到 projects 表
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  // JSONB 型別：可存放 JSON 物件
  requestHeaders: jsonb('request_headers').$type<Record<string, string>>(),
  requestBody: jsonb('request_body'),

  // 使用自訂型別限制欄位值
  method: text('method').notNull().$type<'GET' | 'POST' | 'PUT' | 'DELETE'>(),
})
```

### 4.5 統一匯出

```ts
// server/database/schema/index.ts
export * from './projects'
export * from './issues'
export * from './notifications'
export * from '../../../shared/constants'  // 共用常數
```

---

## 5. 設定檔

### 5.1 環境變數 (.env)

```env
# Supabase 專用連線字串格式
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

**如何取得 DATABASE_URL：**
1. 登入 Supabase Dashboard
2. 進入專案 → Settings → Database
3. 找到 "Connection string" 區塊
4. 選擇 "Transaction pooler" (port 6543)
5. 複製並替換密碼

### 5.2 Drizzle Kit 設定 (drizzle.config.ts)

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // Schema 檔案位置
  schema: './server/database/schema/index.ts',

  // Migration 輸出目錄
  out: './server/database/migrations',

  // 資料庫類型
  dialect: 'postgresql',

  // 資料庫連線
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },

  // Supabase 專用：只操作 public schema
  schemaFilter: ['public'],

  verbose: true,  // 顯示詳細輸出
  strict: true    // 嚴格模式
})
```

### 5.3 Nuxt 設定 (nuxt.config.ts)

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 僅在 server 端可用的環境變數
    databaseUrl: process.env.DATABASE_URL
  }
})
```

### 5.4 Drizzle 客戶端

**方式 A：給 CLI 工具用 (server/database/index.ts)**

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
```

**方式 B：給 Nuxt API Routes 用 (server/utils/db.ts)**

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const connectionString = useRuntimeConfig().databaseUrl
    const client = postgres(connectionString, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}
```

> **為什麼需要兩個？**
> - CLI 工具 (drizzle-kit) 直接讀取 `process.env`
> - Nuxt server 使用 `useRuntimeConfig()` 取得環境變數

---

## 6. 常用指令

在 `package.json` 加入 scripts：

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 指令說明

| 指令 | 用途 | 使用時機 |
|-----|-----|---------|
| `pnpm db:generate` | 根據 schema 產生 migration SQL 檔 | Schema 變更後 |
| `pnpm db:migrate` | 執行 migration，更新資料庫 | 正式環境部署 |
| `pnpm db:push` | 直接把 schema 推送到資料庫 | 開發階段快速測試 |
| `pnpm db:studio` | 開啟視覺化資料庫管理介面 | 查看/編輯資料 |

### 開發流程

```
                    開發環境                        正式環境

1. 修改 schema  ─────────────────────────────────────────────
        │
        ▼
2. pnpm db:push     (快速同步)
   或
   pnpm db:generate (產生 migration)
        │
        ▼
3. 測試功能     ─────────────────────────────────────────────
        │
        ▼
4. 確認無誤     ───────────────► pnpm db:migrate (執行 migration)
```

**db:push vs db:migrate 的差異：**

| | db:push | db:migrate |
|--|---------|------------|
| 用途 | 開發測試 | 正式部署 |
| 會產生 migration 檔？ | 否 | 是 |
| 可追蹤歷史變更？ | 否 | 是 |
| 可能遺失資料？ | 是 | 可控制 |

---

## 7. 在 Nuxt API Routes 中使用

### 7.1 基本查詢

```ts
// server/api/projects/index.get.ts
export default defineEventHandler(async () => {
  const db = useDB()

  // 查詢所有專案
  const allProjects = await db.select().from(projects)

  return allProjects
})
```

### 7.2 條件查詢

```ts
import { eq, like, and, desc } from 'drizzle-orm'

// 根據 ID 查詢
const project = await db
  .select()
  .from(projects)
  .where(eq(projects.id, 'some-uuid'))

// 模糊搜尋
const results = await db
  .select()
  .from(projects)
  .where(like(projects.name, '%keyword%'))

// 多條件 + 排序
const issues = await db
  .select()
  .from(issues)
  .where(and(
    eq(issues.projectId, projectId),
    eq(issues.status, 'Open')
  ))
  .orderBy(desc(issues.createdAt))
```

### 7.3 新增資料

```ts
// server/api/projects/index.post.ts
export default defineEventHandler(async (event) => {
  const db = useDB()
  const body = await readBody(event)

  const [newProject] = await db
    .insert(projects)
    .values({
      name: body.name,
      key: body.key,
      description: body.description
    })
    .returning()  // 回傳新增的資料

  return newProject
})
```

### 7.4 更新資料

```ts
// server/api/projects/[id].put.ts
export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const [updated] = await db
    .update(projects)
    .set({ name: body.name })
    .where(eq(projects.id, id))
    .returning()

  return updated
})
```

### 7.5 刪除資料

```ts
// server/api/projects/[id].delete.ts
export default defineEventHandler(async (event) => {
  const db = useDB()
  const id = getRouterParam(event, 'id')

  await db
    .delete(projects)
    .where(eq(projects.id, id))

  return { success: true }
})
```

---

## 8. 常見問題

### Q1: `DATABASE_URL is not defined` 錯誤

**原因：** 環境變數未正確載入

**解決：**
1. 確認 `.env` 檔案存在且格式正確
2. 重新啟動 dev server
3. 確認 `nuxt.config.ts` 有設定 `runtimeConfig`

### Q2: Migration 失敗

**原因：** Schema 變更與現有資料衝突

**解決：**
- 開發階段：用 `db:push` 強制同步（會清除資料）
- 正式環境：手動調整 migration 檔案

### Q3: 型別錯誤

**原因：** TypeScript 未正確推導 schema 型別

**解決：**
```ts
// 使用 $inferSelect 和 $inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
```

### Q4: Supabase 連線問題

**常見錯誤：** `connection refused` 或 `timeout`

**檢查：**
1. DATABASE_URL 格式是否正確
2. 密碼是否包含特殊字元（需 URL encode）
3. 是否使用正確的 port (6543 for transaction pooler)
4. Supabase 專案是否有啟用

---

## 參考資源

- [Drizzle ORM 官方文件](https://orm.drizzle.team/)
- [Drizzle + Supabase 整合指南](https://orm.drizzle.team/docs/connect-supabase)
- [Nuxt Server Directory](https://nuxt.com/docs/guide/directory-structure/server)
