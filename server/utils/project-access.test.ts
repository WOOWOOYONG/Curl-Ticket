import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { projects } from '~~/server/database/schema'
import {
  buildActiveProjectCondition,
  buildAccessibleActiveProjectCondition,
  buildOwnedActiveProjectCondition,
  buildProjectAccessCondition
} from './project-access'

const dialect = new PgDialect()

function toWhereQuery(condition: ReturnType<typeof buildProjectAccessCondition>) {
  return dialect.sqlToQuery(sql`select * from ${projects} where ${condition}`)
}

describe('project access conditions', () => {
  const userId = 'user-123'

  it('buildProjectAccessCondition checks owner or member access only', () => {
    const query = toWhereQuery(buildProjectAccessCondition(userId))

    expect(query.sql).toContain('"projects"."owner_id" = $1')
    expect(query.sql).toContain('exists (')
    expect(query.sql).toContain('"project_members"."project_id" = "projects"."id"')
    expect(query.sql).toContain('"project_members"."user_id" = $2')
    expect(query.sql).not.toContain('"projects"."deleted_at" is null')
    expect(query.params).toEqual([userId, userId])
  })

  it('buildActiveProjectCondition filters out soft-deleted projects', () => {
    const query = toWhereQuery(buildActiveProjectCondition())

    expect(query.sql).toContain('"projects"."deleted_at" is null')
    expect(query.params).toEqual([])
  })

  it('buildAccessibleActiveProjectCondition combines access and active filters', () => {
    const query = toWhereQuery(buildAccessibleActiveProjectCondition(userId))

    expect(query.sql).toContain('"projects"."deleted_at" is null')
    expect(query.sql).toContain('"projects"."owner_id" = $1')
    expect(query.sql).toContain('"project_members"."user_id" = $2')
    expect(query.params).toEqual([userId, userId])
  })

  it('buildOwnedActiveProjectCondition limits to active owner projects', () => {
    const query = toWhereQuery(buildOwnedActiveProjectCondition(userId))

    expect(query.sql).toContain('"projects"."owner_id" = $1')
    expect(query.sql).toContain('"projects"."deleted_at" is null')
    expect(query.sql).not.toContain('exists (')
    expect(query.params).toEqual([userId])
  })
})
