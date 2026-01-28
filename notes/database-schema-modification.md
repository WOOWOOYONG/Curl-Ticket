# 資料庫 Schema 修改指南

## 目錄

1. [前後端驗證同步原則](#1-前後端驗證同步原則)
2. [修改 Schema 的完整流程](#2-修改-schema-的完整流程)
3. [Zod 與 Drizzle 欄位對照表](#3-zod-與-drizzle-欄位對照表)
4. [Migration 指令說明](#4-migration-指令說明)
5. [常見問題排解](#5-常見問題排解)
6. [重置資料庫（開發環境）](#6-重置資料庫開發環境)

---

## 1. 前後端驗證同步原則

當定義資料欄位的驗證規則時，需要在 **兩個地方** 同步設定：

### 1.1 驗證層級

| 層級 | 檔案位置 | 用途 |
|-----|---------|------|
| **前端/API 驗證** | `shared/schemas/*.ts` (Zod) | 使用者輸入驗證、即時回饋 |
| **資料庫驗證** | `server/database/schema/*.ts` (Drizzle) | 資料完整性保障、效能優化 |

### 1.2 為什麼需要同步？

```
使用者輸入
    │
    ▼
┌─────────────────┐
│  Zod 驗證       │  ← 第一道防線：快速回饋、友善錯誤訊息
│  (前端/API)     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Drizzle Schema │  ← 第二道防線：資料完整性、索引效能
│  (資料庫)        │
└─────────────────┘
    │
    ▼
  資料庫儲存
```

**雙重驗證的好處：**
- 即使前端驗證被繞過（直接呼叫 API、批次匯入），資料庫仍能確保資料符合規範
- 有長度限制的欄位（尤其是有索引的），使用 `varchar(n)` 比 `text` 效能更好
- 確保整個系統的資料一致性

---

## 2. 修改 Schema 的完整流程

### 2.1 步驟總覽

```
1. 修改 Zod Schema (shared/schemas/*.ts)
          │
          ▼
2. 同步修改 Drizzle Schema (server/database/schema/*.ts)
          │
          ▼
3. 產生 Migration 檔案 (pnpm db:generate)
          │
          ▼
4. 檢查 Migration 內容
          │
          ▼
5. 執行 Migration (pnpm db:migrate)
          │
          ▼
6. 驗證資料庫結構
```

### 2.2 詳細步驟

#### Step 1: 修改 Zod Schema

```ts
// shared/schemas/project.ts
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),  // 新增或修改長度限制
  key: z.string().min(2).max(10),
  description: z.string().max(1000).nullish()
})
```

#### Step 2: 同步修改 Drizzle Schema

```ts
// server/database/schema/projects.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),  // 對應 Zod max(100)
  key: varchar('key', { length: 10 }).notNull().unique(),  // 對應 Zod max(10)
  description: varchar('description', { length: 1000 }),  // 對應 Zod max(1000)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
```

#### Step 3: 產生 Migration

```bash
pnpm db:generate
```

這會在 `server/database/migrations/` 產生新的 SQL 檔案。

#### Step 4: 檢查 Migration 內容

查看產生的 SQL 檔案，確認變更內容正確：

```sql
-- 範例：欄位類型變更
ALTER TABLE "projects" ALTER COLUMN "name" SET DATA TYPE varchar(100);
```

#### Step 5: 執行 Migration

```bash
pnpm db:migrate
```

#### Step 6: 驗證結構

可使用 Drizzle Studio 或自訂腳本驗證：

```bash
pnpm db:studio
```

---

## 3. Zod 與 Drizzle 欄位對照表

### 3.1 字串類型

| Zod 驗證 | Drizzle 類型 | 說明 |
|---------|-------------|------|
| `z.string()` | `text('column')` | 無長度限制的文字 |
| `z.string().max(n)` | `varchar('column', { length: n })` | 有長度限制的文字 |
| `z.string().uuid()` | `uuid('column')` | UUID 格式 |
| `z.enum([...])` | `varchar('column', { length: n })` | 列舉值，n = 最長值的長度 |

### 3.2 數值類型

| Zod 驗證 | Drizzle 類型 | 說明 |
|---------|-------------|------|
| `z.number().int()` | `integer('column')` | 整數 |
| `z.number()` | `real('column')` | 浮點數 |
| `z.number().int().positive()` | `serial('column')` | 自動遞增整數 |

### 3.3 其他類型

| Zod 驗證 | Drizzle 類型 | 說明 |
|---------|-------------|------|
| `z.boolean()` | `boolean('column')` | 布林值 |
| `z.coerce.date()` | `timestamp('column')` | 時間戳記 |
| `z.record()` / `z.object()` | `jsonb('column')` | JSON 物件 |
| `z.unknown()` | `jsonb('column')` | 任意 JSON |

### 3.4 可為空值

| Zod 驗證 | Drizzle 類型 |
|---------|-------------|
| `z.string()` (必填) | `varchar(...).notNull()` |
| `z.string().nullable()` | `varchar(...)` (預設可為 null) |
| `z.string().nullish()` | `varchar(...)` (可為 null 或 undefined) |

---

## 4. Migration 指令說明

### 4.1 指令比較

| 指令 | 用途 | 產生檔案 | 適用環境 |
|-----|-----|---------|---------|
| `pnpm db:generate` | 產生 migration SQL 檔 | 是 | 所有環境 |
| `pnpm db:migrate` | 執行 migration 檔案 | 否 | 正式環境 |
| `pnpm db:push` | 直接同步 schema 到資料庫 | 否 | 開發環境 |
| `pnpm db:studio` | 開啟視覺化管理介面 | 否 | 開發環境 |

### 4.2 開發環境 vs 正式環境

**開發環境（可刪除資料）：**
```bash
# 快速同步，不產生 migration 檔案
pnpm db:push
```

**正式環境（需保留資料）：**
```bash
# 產生 migration 檔案
pnpm db:generate

# 檢查 migration 內容
cat server/database/migrations/xxxx_*.sql

# 執行 migration
pnpm db:migrate
```

---

## 5. 常見問題排解

### 5.1 relation "xxx" already exists

**錯誤訊息：**
```
PostgresError: relation "projects" already exists
```

**原因：** Migration 檔案試圖建立已存在的資料表

**解決方案：**
1. 如果是開發環境，參考 [第 6 節](#6-重置資料庫開發環境) 重置資料庫
2. 如果需保留資料，手動修改 migration 檔案，將 `CREATE TABLE` 改為 `ALTER TABLE`

### 5.2 drizzle-kit push 失敗

**錯誤訊息：**
```
TypeError: Cannot read properties of undefined (reading 'replace')
```

**原因：** drizzle-kit 版本問題或資料庫有非標準 constraints

**解決方案：**
1. 升級 drizzle-kit：`pnpm add -D drizzle-kit@latest`
2. 使用重置資料庫後執行 `pnpm db:migrate`

### 5.3 Schema 變更未生效

**檢查清單：**
1. 確認 Zod 和 Drizzle schema 都有修改
2. 確認執行了 `pnpm db:generate` 產生新的 migration
3. 確認執行了 `pnpm db:migrate` 或 `pnpm db:push`
4. 重新啟動 dev server

### 5.4 外鍵約束錯誤

**錯誤訊息：**
```
violates foreign key constraint
```

**解決方案：**
刪除資料表時需按照依賴順序（先刪除子表，再刪除父表），或使用 `CASCADE`：

```sql
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
```

---

## 6. 重置資料庫（開發環境）

### 6.1 使用重置腳本

專案提供了重置腳本 `scripts/reset-db.mjs`：

```bash
# 執行重置（會刪除所有資料表和 migration 記錄）
node scripts/reset-db.mjs

# 重新執行 migration
pnpm db:migrate
```

### 6.2 手動重置

如果需要手動操作：

```bash
# 使用 psql（需安裝 PostgreSQL client）
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 重新執行 migration
pnpm db:migrate
```

### 6.3 驗證腳本

專案提供了驗證腳本 `scripts/verify-schema.mjs`：

```bash
node scripts/verify-schema.mjs
```

輸出範例：
```
PROJECTS:
────────────────────────────────────────────────────────────
  id                   uuid         NOT NULL
  name                 character varying(100)    NOT NULL
  key                  character varying(10)     NOT NULL
  ...
```

---

## 參考資源

- [Drizzle ORM 文件](https://orm.drizzle.team/)
- [Drizzle Kit CLI 指南](https://orm.drizzle.team/kit-docs/overview)
- [Zod 官方文件](https://zod.dev/)
- [專案 Schema 檔案](../shared/schemas/)
- [專案 Database Schema](../server/database/schema/)
