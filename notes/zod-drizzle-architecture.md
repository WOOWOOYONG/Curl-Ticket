# Zod + Drizzle 整合架構筆記

## 目錄

1. [問題背景](#1-問題背景)
2. [解決方案演進](#2-解決方案演進)
3. [最終架構](#3-最終架構)
4. [程式碼範例](#4-程式碼範例)
5. [常數定義模式](#5-常數定義模式)
6. [Zod v4 錯誤處理](#6-zod-v4-錯誤處理)
7. [使用指南](#7-使用指南)

---

## 1. 問題背景

### 1.1 Drizzle 的限制

Drizzle ORM 提供的 `$inferSelect` 和 `$inferInsert` 只是 **TypeScript 型別**，不會在執行時驗證資料：

```ts
// 這段程式碼 TypeScript 不會報錯
const body = await readBody(event) // body 可能是任意值
await db.insert(projects).values(body) // 直接塞進資料庫 💥

// 問題：
// - body.name 可能是 undefined
// - body.key 可能格式錯誤
// - 惡意使用者可以送任意資料
```

### 1.2 我們需要什麼？

| 需求 | Drizzle 單獨使用 | 需要的解決方案 |
|-----|-----------------|--------------|
| 資料庫操作 | ✅ 有 | - |
| 編譯時型別檢查 | ✅ 有 | - |
| **執行時驗證** | ❌ 無 | Zod |
| **前端表單驗證** | ❌ 無 | Zod |
| **前後端共用型別** | ❌ 困難 | 共用 Schema |

---

## 2. 解決方案演進

### 2.1 方案 A：drizzle-zod（最初嘗試）

使用 `drizzle-zod` 套件自動從 Drizzle schema 產生 Zod schema：

```ts
// server/database/schema/projects.ts
import { createInsertSchema } from 'drizzle-zod'

export const projects = pgTable('projects', { ... })
export const insertProjectSchema = createInsertSchema(projects)
```

**問題：**
- Zod schema 在 `server/` 目錄，前端無法使用
- 需要額外定義前端用的型別（重複定義）

### 2.2 方案 B：共用 Zod Schema（最終方案）

將 Zod schema 放在 `shared/` 目錄，前後端共用：

```
shared/schemas/
├── project.ts    ← Zod schema 定義在這裡
└── issue.ts

前端 ──────────────────────────────────────────┐
                                               │
              import { createProjectSchema }   │
              from '~~/shared/schemas'         │
                                               ▼
                                    ┌──────────────────┐
                                    │  shared/schemas  │
                                    │  ├── project.ts  │
                                    │  └── issue.ts    │
                                    └──────────────────┘
                                               ▲
              import { createProjectSchema }   │
              from '~~/shared/schemas'         │
                                               │
後端 ──────────────────────────────────────────┘
```

---

## 3. 最終架構

### 3.1 目錄結構

```
shared/                          # 前後端共用
├── index.ts                     # 統一匯出
├── constants.ts                 # 常數定義（Environment, HttpMethod 等）
└── schemas/
    ├── index.ts
    ├── project.ts               # Project 的 Zod schema + 型別
    └── issue.ts                 # Issue 的 Zod schema + 型別

server/
├── database/
│   └── schema/
│       ├── projects.ts          # Drizzle table 定義（簡潔）
│       ├── issues.ts
│       └── notifications.ts
└── api/
    └── projects/
        └── index.post.ts        # 使用共用 schema 驗證
```

### 3.2 各層職責

| 層級 | 位置 | 職責 | 前端可用 |
|-----|-----|-----|---------|
| 常數 | `shared/constants.ts` | 定義 enum-like 常數 | ✅ |
| Zod Schema | `shared/schemas/` | 驗證規則 + 型別推導 | ✅ |
| Drizzle Schema | `server/database/schema/` | 資料庫表結構 | ❌ |

### 3.3 資料流

```
┌─────────────────────────────────────────────────────────────────┐
│                           前端                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 使用者填寫表單                                                │
│          │                                                       │
│          ▼                                                       │
│  2. createProjectSchema.safeParse(formData)  ← 前端驗證          │
│          │                                                       │
│          ▼                                                       │
│  3. 驗證通過，送出 API 請求                                       │
│                                                                  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                           後端                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  4. 接收 request body                                            │
│          │                                                       │
│          ▼                                                       │
│  5. createProjectSchema.safeParse(body)  ← 後端驗證（同一份！）   │
│          │                                                       │
│          ▼                                                       │
│  6. 驗證通過，寫入資料庫                                          │
│     db.insert(projects).values(result.data)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 程式碼範例

### 4.1 共用 Schema 定義

```ts
// shared/schemas/project.ts
import { z } from 'zod'

// 新增專案用的 schema
export const createProjectSchema = z.object({
  name: z.string().min(1, '專案名稱不可為空').max(100),
  key: z.string()
    .min(2, '專案代號至少 2 個字元')
    .max(10)
    .regex(/^[A-Z0-9]+$/, '只能包含大寫字母和數字'),
  description: z.string().nullish()
})

// 更新專案用的 schema（所有欄位 optional）
export const updateProjectSchema = createProjectSchema.partial()

// 完整專案資料 schema
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date()
})

// 型別自動從 schema 推導
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type Project = z.infer<typeof projectSchema>
```

### 4.2 Drizzle Table 定義（簡潔版）

```ts
// server/database/schema/projects.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

// 只定義資料表結構，驗證邏輯在 shared/schemas
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
```

### 4.3 後端 API 使用

```ts
// server/api/projects/index.post.ts
import { projects } from '../../database/schema'
import { createProjectSchema } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const body = await readBody(event)

  // 使用共用 schema 驗證
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.issues
    })
  }

  // result.data 已經是正確型別
  const [newProject] = await db
    .insert(projects)
    .values(result.data)
    .returning()

  return newProject
})
```

### 4.4 前端表單使用

```vue
<script setup lang="ts">
import { createProjectSchema, type CreateProjectInput } from '~~/shared'

const form = ref<CreateProjectInput>({
  name: '',
  key: '',
  description: ''
})

const errors = ref<Record<string, string[]>>({})

async function handleSubmit() {
  // 前端驗證（使用同一份 schema）
  const result = createProjectSchema.safeParse(form.value)

  if (!result.success) {
    // 將 issues 轉換為 fieldErrors 格式
    errors.value = result.error.issues.reduce((acc, issue) => {
      const field = issue.path.join('.')
      if (!acc[field]) acc[field] = []
      acc[field].push(issue.message)
      return acc
    }, {} as Record<string, string[]>)
    return
  }

  // 驗證通過，送出請求
  await $fetch('/api/projects', {
    method: 'POST',
    body: result.data
  })
}
</script>
```

---

## 5. 常數定義模式

### 5.1 避免 Magic String

為了避免在程式碼中散落 magic string（如 `'Dev'`、`'Open'`），我們採用物件 + 陣列的雙重定義：

```ts
// shared/constants.ts

// 物件形式 - 用於引用特定值
export const Environment = {
  Local: 'Local',
  Dev: 'Dev',
  Staging: 'Staging',
  Prod: 'Prod'
} as const

// 陣列形式 - 用於 Zod z.enum() 和下拉選單
export const environments = Object.values(Environment)

// 型別 - 用於型別標註
export type Environment = typeof Environment[keyof typeof Environment]
```

### 5.2 使用場景對照

| 場景 | 使用形式 | 範例 |
|-----|---------|------|
| 設定預設值 | 物件 | `.default(Environment.Dev)` |
| Zod enum 驗證 | 陣列 | `z.enum(environments)` |
| 下拉選單選項 | 陣列 | `environments.map(e => ...)` |
| 條件判斷 | 物件 | `if (env === Environment.Prod)` |
| 型別標註 | 型別 | `environment: Environment` |

### 5.3 在各處使用

```ts
// Drizzle schema - 預設值
environment: text('environment')
  .notNull()
  .$type<EnvironmentType>()
  .default(Environment.Dev)  // ✅ 使用常數

// Zod schema - enum 驗證 + 預設值
environment: z
  .enum(environments)        // ✅ 使用陣列
  .default(Environment.Dev)  // ✅ 使用常數

// 前端 - 下拉選單
<select>
  <option v-for="env in environments" :value="env">
    {{ env }}
  </option>
</select>

// 前端 - 條件渲染
<Badge v-if="issue.environment === Environment.Prod" color="red">
  Production
</Badge>
```

---

## 6. Zod v4 錯誤處理

### 6.1 棄用方法說明

在 Zod v4 中，`flatten()` 和 `format()` 方法已被標記為棄用（deprecated）。推薦使用 `result.error.issues` 來處理驗證錯誤。

### 6.2 錯誤處理對照表

| 使用場景 | 舊方法 (已棄用) | 新方法 (推薦) |
|---------|----------------|--------------|
| 後端 API 回應 | `result.error.flatten()` | `result.error.issues` |
| 前端表單錯誤 | `result.error.flatten().fieldErrors` | 手動轉換 `issues` (見下方) |

### 6.3 `result.error.issues` 結構

```ts
// issues 是一個陣列，每個元素包含：
[
  {
    code: "invalid_type",           // 錯誤類型
    path: ["name"],                  // 欄位路徑
    message: "Expected string, received number",  // 錯誤訊息
    expected: "string",
    received: "number"
  },
  {
    code: "too_small",
    path: ["key"],
    message: "專案代號至少 2 個字元",
    minimum: 2,
    type: "string"
  }
]
```

### 6.4 前端錯誤格式轉換

若需要像 `flatten().fieldErrors` 那樣的物件格式，可以手動轉換：

```ts
// 將 issues 轉換為 { [field]: [errors] } 格式
const fieldErrors = result.error.issues.reduce((acc, issue) => {
  const field = issue.path.join('.')  // 將路徑轉為字串，例如：["address", "city"] -> "address.city"
  if (!acc[field]) acc[field] = []
  acc[field].push(issue.message)
  return acc
}, {} as Record<string, string[]>)

// 結果：
// {
//   "name": ["名稱不可為空"],
//   "key": ["專案代號至少 2 個字元", "只能包含大寫字母和數字"]
// }
```

或者建立一個可重用的 helper function：

```ts
// shared/utils/zod.ts
import type { ZodIssue } from 'zod'

export function formatZodErrors(issues: ZodIssue[]): Record<string, string[]> {
  return issues.reduce((acc, issue) => {
    const field = issue.path.join('.')
    if (!acc[field]) acc[field] = []
    acc[field].push(issue.message)
    return acc
  }, {} as Record<string, string[]>)
}

// 使用
if (!result.success) {
  errors.value = formatZodErrors(result.error.issues)
}
```

---

## 7. 使用指南

### 7.1 新增資料表的步驟

1. **定義常數**（如需要）
   ```ts
   // shared/constants.ts
   export const NewStatus = { ... } as const
   ```

2. **建立 Zod Schema**
   ```ts
   // shared/schemas/new-table.ts
   export const createNewTableSchema = z.object({ ... })
   export type CreateNewTableInput = z.infer<typeof createNewTableSchema>
   ```

3. **建立 Drizzle Table**
   ```ts
   // server/database/schema/new-table.ts
   export const newTable = pgTable('new_table', { ... })
   ```

4. **建立 API Route**
   ```ts
   // server/api/new-table/index.post.ts
   import { createNewTableSchema } from '~~/shared/schemas'
   ```

### 7.2 修改欄位的步驟

1. 更新 `shared/schemas/` 中的 Zod schema
2. 更新 `server/database/schema/` 中的 Drizzle table
3. 執行 `pnpm db:push` 或 `pnpm db:generate` + `pnpm db:migrate`

### 7.3 drizzle-zod 還需要嗎？

**不需要了。** 我們改用手動在 `shared/` 定義 Zod schema，這樣：

- ✅ 前後端都能使用
- ✅ 可以加入自訂驗證規則
- ✅ 單一來源，無重複定義

如果你的專案是**純後端 API**（無前端），`drizzle-zod` 仍然是個好選擇，可以減少手動定義 schema 的工作。

---

## 總結

| 改變前 | 改變後 |
|-------|-------|
| Zod schema 在 `server/` | Zod schema 在 `shared/` |
| 前後端各自定義型別 | 前後端共用型別 |
| Magic string 散落各處 | 統一使用常數物件 |
| 只有後端驗證 | 前後端都可驗證 |
| drizzle-zod 產生 schema | 手動定義 schema（更靈活） |

這個架構的核心理念是：**Zod Schema 是 Single Source of Truth**，所有的型別和驗證規則都從這裡推導。
