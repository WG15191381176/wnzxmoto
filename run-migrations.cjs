// 运行数据库迁移
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, 'inventory.db')
const db = new Database(dbPath)
console.log('数据库连接成功:', dbPath)

// 启用外键约束
db.pragma('foreign_keys = ON')

// 运行迁移 1
const migration1 = fs.readFileSync(path.join(__dirname, 'src-tauri/migrations/001_initial_tables.sql'), 'utf8')
db.exec(migration1)
console.log('迁移 1 完成: create_initial_tables')

// 运行迁移 4
const migration4 = fs.readFileSync(path.join(__dirname, 'src-tauri/migrations/004_add_suppliers_notes.sql'), 'utf8')
db.exec(migration4)
console.log('迁移 4 完成: add_suppliers_notes')

// 验证表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
console.log('\n数据库表:')
tables.forEach(t => console.log('  ', t.name))

// 检查 parts 表结构
const partsSchema = db.prepare("PRAGMA table_info(parts)").all()
console.log('\nparts 表结构:')
partsSchema.forEach(c => console.log(`  ${c.name} (${c.type})${c.notnull ? ' NOT NULL' : ''}${c.dflt_value !== null ? ' DEFAULT ' + c.dflt_value : ''}`))

db.close()
console.log('\n迁移完成')