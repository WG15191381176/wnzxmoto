import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { select, selectOne, execute, transaction, generateOrderNo } from '@/utils/db'
import type { Part, InOrder, InOrderItem, OutOrder, OutOrderItem, StockLog } from '@/types'

export const usePartsStore = defineStore('parts', () => {
  const parts = ref<Part[]>([])
  const loading = ref(false)
  const searchQuery = ref('')
  const categoryFilter = ref('')
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)

  const filteredParts = computed(() => {
    let result = parts.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(p =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.english_name?.toLowerCase().includes(q) ?? false) ||
        (p.spec?.toLowerCase().includes(q) ?? false)
      )
    }
    if (categoryFilter.value) {
      result = result.filter(p => p.category === categoryFilter.value)
    }
    return result
  })

  const categories = computed(() => {
    const cats = new Set(parts.value.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  })

  const lowStockParts = computed(() =>
    parts.value.filter(p => p.stock_qty <= p.min_stock && p.min_stock > 0)
  )

  const outOfStockParts = computed(() =>
    parts.value.filter(p => p.stock_qty <= 0)
  )

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  async function loadParts(opts?: { page?: number; pageSize?: number; search?: string; category?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) page.value = opts.page
      if (opts?.pageSize !== undefined) pageSize.value = opts.pageSize
      if (opts?.search !== undefined) searchQuery.value = opts.search
      if (opts?.category !== undefined) categoryFilter.value = opts.category

      // 构建 WHERE 条件
      const conditions: string[] = []
      const params: unknown[] = []
      if (searchQuery.value) {
        conditions.push('(code LIKE ? OR name LIKE ? OR spec LIKE ?)')
        const kw = `%${searchQuery.value}%`
        params.push(kw, kw, kw)
      }
      if (categoryFilter.value) {
        conditions.push('category = ?')
        params.push(categoryFilter.value)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      // 查总数
      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM parts ${whereClause}`, params)
      total.value = countResult[0]?.cnt ?? 0

      // 分页查询
      const offset = (page.value - 1) * pageSize.value
      params.push(pageSize.value, offset)
      parts.value = await select<Part>(
        `SELECT * FROM parts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  // 加载所有配件（不分页，用于下拉选择框）
  async function loadAllParts() {
    loading.value = true
    try {
      parts.value = await select<Part>('SELECT * FROM parts ORDER BY created_at DESC')
    } finally {
      loading.value = false
    }
  }

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
      loadParts()
    }
  }

  function setPageSize(newSize: number) {
    pageSize.value = newSize
    page.value = 1
    loadParts()
  }

  async function getPart(id: number): Promise<Part | null> {
    return selectOne<Part>('SELECT * FROM parts WHERE id = ?', [id])
  }

  async function getPartByCode(code: string): Promise<Part | null> {
    return selectOne<Part>('SELECT * FROM parts WHERE code = ?', [code])
  }

  async function createPart(part: Omit<Part, 'id' | 'created_at'>): Promise<number> {
    const result = await execute(
      `INSERT INTO parts (code, name, english_name, spec, vehicle_qty, unit, cost_price, sale_price, stock_qty, min_stock, category, location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [part.code, part.name, part.english_name, part.spec, part.vehicle_qty, part.unit, part.cost_price, part.sale_price, part.stock_qty, part.min_stock, part.category, part.location, part.notes]
    )
    await loadParts()
    return result.lastInsertId
  }

  async function updatePart(id: number, part: Partial<Part>): Promise<void> {
    const fields = Object.keys(part).filter(k => k !== 'id' && k !== 'created_at')
    if (fields.length === 0) return
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => (part as any)[f])
    values.push(id)
    await execute(`UPDATE parts SET ${setClause} WHERE id = ?`, values)
    await loadParts()
  }

  async function deletePart(id: number): Promise<void> {
    await execute('DELETE FROM parts WHERE id = ?', [id])
    await loadParts()
  }

  async function adjustStock(partId: number, qtyChange: number, refType: string, refId: number, remark?: string): Promise<void> {
    await transaction(async (db) => {
      const part = await db.select<Part>('SELECT * FROM parts WHERE id = ?', [partId])
      if (!part[0]) throw new Error('配件不存在')
      const beforeQty = part[0].stock_qty
      const afterQty = beforeQty + qtyChange
      if (afterQty < 0) throw new Error('库存不足')

      await db.execute('UPDATE parts SET stock_qty = ? WHERE id = ?', [afterQty, partId])
      await db.execute(
        `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [partId, qtyChange > 0 ? 'in' : 'out', Math.abs(qtyChange), beforeQty, afterQty, refType, refId, remark]
      )
    })
    await loadParts()
  }

  // Excel 导入配件基础数据（兼容中英文表头，支持用户提供的 Excel 格式，含合并单元格处理）
  async function importPartsFromExcel(rows: any[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    // 字段映射：完全匹配用户 Excel 表头（含\n换行）
    const fieldMap: Record<string, string[]> = {
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

    function getValue(row: any, field: string): any {
      const possibleKeys = fieldMap[field] || [field]
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key]
        }
      }
      return undefined
    }

    // 处理合并单元格：向下填充 sale_price, unit, english_name, spec, vehicle_qty, notes, category, location
    // 从上到下遍历，记录上一个非空值
    let lastSalePrice: any = undefined
    let lastUnit: any = undefined
    let lastEnglishName: any = undefined
    let lastSpec: any = undefined
    let lastVehicleQty: any = undefined
    let lastNotes: any = undefined
    let lastCategory: any = undefined
    let lastLocation: any = undefined

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel 行号（包含表头）

      // 向下填充：当前行有值则更新 lastX，无值则用 lastX
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

      // 回填到行对象（不修改原 rows，仅本次循环使用）
      const salePrice = currSalePrice !== undefined ? currSalePrice : lastSalePrice
      const unit = currUnit !== undefined ? currUnit : lastUnit
      const englishName = currEnglishName !== undefined ? currEnglishName : lastEnglishName
      const spec = currSpec !== undefined ? currSpec : lastSpec
      const vehicleQty = currVehicleQty !== undefined ? currVehicleQty : lastVehicleQty
      const notes = currNotes !== undefined ? currNotes : lastNotes
      const category = currCategory !== undefined ? currCategory : lastCategory
      const location = currLocation !== undefined ? currLocation : lastLocation

      try {
        // 验证必填字段：编码和名称
        const code = getValue(row, 'code')
        const name = getValue(row, 'name')
        if (!code || !name) {
          errors.push(`第 ${rowNum} 行：编码和名称为必填项`)
          failed++
          continue
        }

        // 检查编码是否已存在
        const existing = await getPartByCode(String(code).trim())
        if (existing) {
          errors.push(`第 ${rowNum} 行：编码 "${code}" 已存在`)
          failed++
          continue
        }

        const unitClean = unit ? String(unit).trim().replace('\nItem', '').replace('件\n', '件') : '个'
        const vehicleQtyNum = vehicleQty !== undefined && vehicleQty !== '' ? parseInt(String(vehicleQty)) : 1

        const part: Omit<Part, 'id' | 'created_at'> = {
          code: String(code).trim(),
          name: String(name).trim(),
          english_name: englishName ? String(englishName).trim() : '',
          spec: spec ? String(spec).trim() : '',
          vehicle_qty: isNaN(vehicleQtyNum) ? 1 : vehicleQtyNum,
          unit: unitClean,
          cost_price: salePrice !== undefined && salePrice !== '' ? parseFloat(String(salePrice)) : 0,  // 用统一零售价作为进货价参考
          sale_price: salePrice !== undefined && salePrice !== '' ? parseFloat(String(salePrice)) : 0,
          stock_qty: 0,  // 用户要求：所有库存数初始值为 0
          min_stock: 0,
          category: category ? String(category).trim() : '',
          location: location ? String(location).trim() : '',
          notes: notes ? String(notes).trim() : '',
        }

        await createPart(part)
        success++
      } catch (error: any) {
        errors.push(`第 ${rowNum} 行：${error.message}`)
        failed++
      }
    }

    return { success, failed, errors }
  }

  return {
    parts,
    loading,
    searchQuery,
    categoryFilter,
    page,
    pageSize,
    total,
    totalPages,
    filteredParts,
    categories,
    lowStockParts,
    outOfStockParts,
    loadParts,
    loadAllParts,
    setPage,
    setPageSize,
    getPart,
    getPartByCode,
    createPart,
    updatePart,
    deletePart,
    adjustStock,
    importPartsFromExcel,
  }
})