import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { select, selectOne, execute } from '@/utils/db'
import type { Supplier } from '@/types'

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([])
  const loading = ref(false)
  const searchQuery = ref('')

  // 分页
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)

  const filteredSuppliers = computed(() => {
    let result = suppliers.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.contact?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false)
      )
    }
    return result
  })

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  async function loadSuppliers(opts?: { page?: number; pageSize?: number; search?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) page.value = opts.page
      if (opts?.pageSize !== undefined) pageSize.value = opts.pageSize
      if (opts?.search !== undefined) searchQuery.value = opts.search

      const conditions: string[] = []
      const params: unknown[] = []
      if (searchQuery.value) {
        conditions.push('(name LIKE ? OR contact LIKE ? OR phone LIKE ?)')
        const kw = `%${searchQuery.value}%`
        params.push(kw, kw, kw)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM suppliers ${whereClause}`, params)
      total.value = countResult[0]?.cnt ?? 0

      const offset = (page.value - 1) * pageSize.value
      params.push(pageSize.value, offset)
      suppliers.value = await select<Supplier>(
        `SELECT * FROM suppliers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
      loadSuppliers()
    }
  }

  function setPageSize(newSize: number) {
    pageSize.value = newSize
    page.value = 1
    loadSuppliers()
  }

  async function getSupplier(id: number): Promise<Supplier | null> {
    return selectOne<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id])
  }

  async function createSupplier(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<number> {
    const result = await execute(
      `INSERT INTO suppliers (name, contact, phone, address, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [supplier.name, supplier.contact, supplier.phone, supplier.address, supplier.notes]
    )
    await loadSuppliers()
    return result.lastInsertId
  }

  async function updateSupplier(id: number, supplier: Partial<Supplier>): Promise<void> {
    const fields = Object.keys(supplier).filter(k => k !== 'id' && k !== 'created_at')
    if (fields.length === 0) return
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => (supplier as any)[f])
    values.push(id)
    await execute(`UPDATE suppliers SET ${setClause} WHERE id = ?`, values)
    await loadSuppliers()
  }

  async function deleteSupplier(id: number): Promise<void> {
    await execute('DELETE FROM suppliers WHERE id = ?', [id])
    await loadSuppliers()
  }

  // Excel 导入供应商
  async function importSuppliersFromExcel(rows: any[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        if (!row.name) {
          errors.push(`第 ${rowNum} 行：供应商名称为必填项`)
          failed++
          continue
        }

        const supplier: Omit<Supplier, 'id' | 'created_at'> = {
          name: String(row.name).trim(),
          contact: row.contact ? String(row.contact).trim() : '',
          phone: row.phone ? String(row.phone).trim() : '',
          address: row.address ? String(row.address).trim() : ''
        }

        await createSupplier(supplier)
        success++
      } catch (error: any) {
        errors.push(`第 ${rowNum} 行：${error.message}`)
        failed++
      }
    }

    return { success, failed, errors }
  }

  return {
    suppliers,
    loading,
    searchQuery,
    page,
    pageSize,
    total,
    totalPages,
    filteredSuppliers,
    loadSuppliers,
    setPage,
    setPageSize,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    importSuppliersFromExcel,
  }
})