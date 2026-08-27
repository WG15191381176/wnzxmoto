import { invoke } from '@tauri-apps/api/core'
import Sql from '@tauri-apps/plugin-sql'

export interface DatabaseRow {
  [key: string]: unknown
}

let db: Sql | null = null

export async function getDb(): Promise<Sql> {
  if (db) return db
  db = await invoke('plugin:sql|connect', { dbUrl: 'sqlite:inventory.db' })
  return db
}

export interface ExecuteResult {
  rowsAffected: number
  lastInsertId: number
}

export async function execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
  const database = await getDb()
  const result = await database.execute(sql, params)
  return {
    rowsAffected: result.rowsAffected ?? 0,
    lastInsertId: result.lastInsertId ?? 0
  }
}

export async function select<T = DatabaseRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDb()
  return database.select<T>(sql, params) as Promise<T[]>
}

export async function selectOne<T = DatabaseRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await select<T>(sql, params)
  return rows[0] || null
}

export async function transaction<T>(callback: (tx: Sql) => Promise<T>): Promise<T> {
  const database = await getDb()
  await database.execute('BEGIN')
  try {
    const result = await callback(database)
    await database.execute('COMMIT')
    return result
  } catch (error) {
    await database.execute('ROLLBACK')
    throw error
  }
}

export function generateOrderNo(prefix: string): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
  const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}${dateStr}${timeStr}${random}`
}