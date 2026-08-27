// 运行缺失的迁移
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, 'inventory.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const migrations = [
  '002_add_new_fields.sql',
  '003_add_part_english_name_notes.sql'
]

migrations.forEach(m => {
  const sql = fs.readFileSync(path.join(__dirname, 'src-tauri/migrations', m), 'utf8')
  db.exec(sql)
  console.log('迁移完成:', m)
})

const partsSchema = db.prepare("PRAGMA table_info(parts)").all()
console.log('\nparts 表结构:')
partsSchema.forEach(c => console.log(`  ${c.name} (${c.type})${c.notnull ? ' NOT NULL' : ''}${c.dflt_value !== null ? ' DEFAULT ' + c.dflt_value : ''}`))

db.close()