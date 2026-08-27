#!/usr/bin/env node
// 导入 Excel 数据到 SQLite 数据库 - 修正版：按编码聚合车型
// 运行方式: node import-excel-fixed.cjs

const Database = require('better-sqlite3')
const XLSX = require('xlsx')
const path = require('path')

// 数据库路径
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

// 第一遍：按编码分组，聚合车型
const codeGroups = new Map()

rows.forEach((row, i) => {
  const code = getValue(row, 'code')
  const name = getValue(row, 'name')
  if (!code || !name) return

  const codeStr = String(code).trim()
  const nameStr = String(name).trim()
  const category = getValue(row, 'category')
  const catStr = category ? String(category).trim() : ''

  if (!codeGroups.has(codeStr)) {
    codeGroups.set(codeStr, {
      code: codeStr,
      name: nameStr,
      english_name: '',
      spec: '',
      vehicle_qty: 1,
      unit: '个',
      cost_price: 0,
      sale_price: 0,
      stock_qty: 0,
      min_stock: 0,
      categories: new Set(),
      location: '',
      notes: '',
      firstRow: row,
    })
  }

  const group = codeGroups.get(codeStr)

  // 聚合车型
  if (catStr) group.categories.add(catStr)

  // 只在第一次遇到时取其他字段（或取最新非空值）
  const currEnglishName = getValue(row, 'english_name')
  const currSpec = getValue(row, 'spec')
  const currVehicleQty = getValue(row, 'vehicle_qty')
  const currUnit = getValue(row, 'unit')
  const currSalePrice = getValue(row, 'sale_price')
  const currCostPrice = getValue(row, 'cost_price')
  const currLocation = getValue(row, 'location')
  const currNotes = getValue(row, 'notes')

  if (currEnglishName !== undefined && group.english_name === '') group.english_name = String(currEnglishName).trim()
  if (currSpec !== undefined && group.spec === '') group.spec = String(currSpec).trim()
  if (currVehicleQty !== undefined && group.vehicle_qty === 1) group.vehicle_qty = parseInt(String(currVehicleQty)) || 1
  if (currUnit !== undefined && group.unit === '个') group.unit = String(currUnit).trim().replace('\nItem', '').replace('件\n', '件')
  if (currSalePrice !== undefined && group.sale_price === 0) group.sale_price = parseFloat(String(currSalePrice)) || 0
  if (currCostPrice !== undefined && group.cost_price === 0) group.cost_price = parseFloat(String(currCostPrice)) || 0
  if (currLocation !== undefined && group.location === '') group.location = String(currLocation).trim()
  if (currNotes !== undefined && group.notes === '') group.notes = String(currNotes).trim()
})

console.log(`去重后唯一编码: ${codeGroups.size}`)
let multiCatCount = 0
codeGroups.forEach(g => { if (g.categories.size > 1) multiCatCount++ })
console.log(`其中多车型编码: ${multiCatCount}`)

// 插入语句
const stmt = db.prepare(`
  INSERT OR IGNORE INTO parts (code, name, english_name, spec, vehicle_qty, unit, cost_price, sale_price, stock_qty, min_stock, category, location, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let success = 0
let failed = 0
const errors = []

const insertMany = db.transaction((groups) => {
  for (const [codeStr, group] of groups) {
    // 合并车型：用逗号分隔
    const mergedCategory = Array.from(group.categories).join(', ')

    const unitClean = group.unit ? String(group.unit).trim().replace('\nItem', '').replace('件\n', '件') : '个'
    const vehicleQtyNum = group.vehicle_qty !== undefined && group.vehicle_qty !== '' ? parseInt(String(group.vehicle_qty)) : 1
    const finalVehicleQty = isNaN(vehicleQtyNum) ? 1 : vehicleQtyNum
    const partSalePrice = group.sale_price !== undefined && group.sale_price !== '' ? parseFloat(String(group.sale_price)) : 0
    const partCostPrice = group.cost_price !== undefined && group.cost_price !== '' ? parseFloat(String(group.cost_price)) : partSalePrice

    stmt.run(
      group.code,
      group.name,
      group.english_name || '',
      group.spec || '',
      finalVehicleQty,
      unitClean,
      partCostPrice,
      partSalePrice,
      0,  // stock_qty 初始为 0
      0,  // min_stock
      mergedCategory,
      group.location || '',
      group.notes || ''
    )
    success++

    if (success % 500 === 0) {
      console.log(`已导入 ${success} 条...`)
    }
  }
})

try {
  insertMany(codeGroups)
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

  // 打印几个多车型示例
  const samples = db.prepare(`
    SELECT code, name, category FROM parts
    WHERE category LIKE '%,%'
    LIMIT 5
  `).all()
  console.log('\n多车型合并示例:')
  samples.forEach(s => console.log(`  ${s.code} | ${s.name} | ${s.category}`))

} catch (err) {
  console.error('导入失败:', err)
} finally {
  db.close()
}