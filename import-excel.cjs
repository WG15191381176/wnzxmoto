#!/usr/bin/env node
// 导入 Excel 数据到 SQLite 数据库
// 运行方式: node import-excel.js

const Database = require('better-sqlite3')
const XLSX = require('xlsx')
const path = require('path')

// 数据库路径 (Tauri 默认路径)
const dbPath = path.join(__dirname, 'inventory.db')

// Excel 文件路径
const excelPath = '/home/wg/.hermes/cache/documents/doc_741b5547a294_张雪机车零配件价格基础表.xlsx'

// 连接数据库
const db = new Database(dbPath)
console.log('数据库连接成功:', dbPath)

// 启用外键约束
db.pragma('foreign_keys = ON')

// 读取 Excel
console.log('读取 Excel 文件:', excelPath)
const workbook = XLSX.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })

console.log(`读取到 ${rows.length} 行数据`)

// 字段映射
const fieldMap = {
  code: ['code', '零部件编码\nComponent code', '零部件编码'],
  name: ['name', '中文名称\nChinese Name', '中文名称'],
  english_name: ['english_name', '英文名称\nEnglish Name', '英文名称'],
  spec: ['spec', '规格\nSpecification', '规格'],
  vehicle_qty: ['vehicle_qty', '原车数量\nQuantity', '原车数量'],
  unit: ['unit', '单位\nUnit', '单位'],
  notes: ['notes', '备注\nNotes', '备注'],
  sale_price: ['sale_price', '统一零售价\nUnified Retail Price', '统一零售价'],
  cost_price: ['cost_price', '进货价格'],
  stock_qty: ['stock_qty', '库存数'],
  min_stock: ['min_stock', '预警库存'],
  category: ['category', '分类', '适用车型'],
  location: ['location', '货位号'],
}

function getValue(row, field) {
  const possibleKeys = fieldMap[field] || [field]
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return undefined
}

// 处理合并单元格：向下填充
let lastSalePrice = undefined
let lastUnit = undefined
let lastEnglishName = undefined
let lastSpec = undefined
let lastVehicleQty = undefined
let lastNotes = undefined
let lastCategory = undefined
let lastLocation = undefined

const stmt = db.prepare(`
  INSERT OR IGNORE INTO parts (code, name, english_name, spec, vehicle_qty, unit, cost_price, sale_price, stock_qty, min_stock, category, location, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let success = 0
let failed = 0
const errors = []

const insertMany = db.transaction((rows) => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    // 向下填充
    const currSalePrice = getValue(row, 'sale_price')
    const currUnit = getValue(row, 'unit')
    const currEnglishName = getValue(row, 'english_name')
    const currSpec = getValue(row, 'spec')
    const currVehicleQty = getValue(row, 'vehicle_qty')
    const currNotes = getValue(row, 'notes')
    const currCategory = getValue(row, 'category')
    const currLocation = getValue(row, 'location')

    if (currSalePrice !== undefined) lastSalePrice = currSalePrice
    if (currUnit !== undefined) lastUnit = currUnit
    if (currEnglishName !== undefined) lastEnglishName = currEnglishName
    if (currSpec !== undefined) lastSpec = currSpec
    if (currVehicleQty !== undefined) lastVehicleQty = currVehicleQty
    if (currNotes !== undefined) lastNotes = currNotes
    if (currCategory !== undefined) lastCategory = currCategory
    if (currLocation !== undefined) lastLocation = currLocation

    const salePrice = currSalePrice !== undefined ? currSalePrice : lastSalePrice
    const unit = currUnit !== undefined ? currUnit : lastUnit
    const englishName = currEnglishName !== undefined ? currEnglishName : lastEnglishName
    const spec = currSpec !== undefined ? currSpec : lastSpec
    const vehicleQty = currVehicleQty !== undefined ? currVehicleQty : lastVehicleQty
    const notes = currNotes !== undefined ? currNotes : lastNotes
    const category = currCategory !== undefined ? currCategory : lastCategory
    const location = currLocation !== undefined ? currLocation : lastLocation

    // 验证必填字段
    const code = getValue(row, 'code')
    const name = getValue(row, 'name')
    if (!code || !name) {
      errors.push(`第 ${rowNum} 行：编码和名称为必填项`)
      failed++
      continue
    }

    const codeStr = String(code).trim()
    const nameStr = String(name).trim()

    // 检查编码是否已存在
    const existing = db.prepare('SELECT id FROM parts WHERE code = ?').get(codeStr)
    if (existing) {
      errors.push(`第 ${rowNum} 行：编码 "${codeStr}" 已存在`)
      failed++
      continue
    }

    const unitClean = unit ? String(unit).trim().replace('\nItem', '').replace('件\n', '件') : '个'
    const vehicleQtyNum = vehicleQty !== undefined && vehicleQty !== '' ? parseInt(String(vehicleQty)) : 1
    const finalVehicleQty = isNaN(vehicleQtyNum) ? 1 : vehicleQtyNum

    const partSalePrice = salePrice !== undefined && salePrice !== '' ? parseFloat(String(salePrice)) : 0

    stmt.run(
      codeStr,
      nameStr,
      englishName ? String(englishName).trim() : '',
      spec ? String(spec).trim() : '',
      finalVehicleQty,
      unitClean,
      partSalePrice,  // cost_price 使用统一零售价作为参考
      partSalePrice,  // sale_price
      0,              // stock_qty 初始为 0
      0,              // min_stock
      category ? String(category).trim() : '',
      location ? String(location).trim() : '',
      notes ? String(notes).trim() : ''
    )
    success++

    if (success % 500 === 0) {
      console.log(`已导入 ${success} 条...`)
    }
  }
})

try {
  insertMany(rows)
  console.log('\n=== 导入完成 ===')
  console.log(`成功: ${success}`)
  console.log(`失败: ${failed}`)
  if (errors.length > 0) {
    console.log('\n错误详情:')
    errors.slice(0, 20).forEach(e => console.log('  ', e))
    if (errors.length > 20) console.log(`  ... 共 ${errors.length} 个错误`)
  }

  // 验证导入结果
  const count = db.prepare('SELECT COUNT(*) as cnt FROM parts').get()
  console.log(`\n数据库中配件总数: ${count.cnt}`)
} catch (err) {
  console.error('导入失败:', err)
} finally {
  db.close()
}