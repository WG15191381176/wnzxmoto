// Excel 文件解析与导出工具类
import * as XLSX from 'xlsx'

export interface ExcelColumn {
  key: string
  label: string
  width?: number
}

export interface ImportResult<T> {
  success: number
  failed: number
  errors: string[]
  data: T[]
}

/**
 * 解析 Excel 文件为 JSON 对象数组
 */
export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        resolve(json)
      } catch (error) {
        reject(new Error(`Excel 解析失败: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 将数据导出为 Excel 文件
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  // 准备表头
  const headers = columns.map(col => col.label)
  const keys = columns.map(col => col.key)

  // 转换数据
  const rows = data.map(item => {
    const row: Record<string, any> = {}
    keys.forEach((key, index) => {
      row[headers[index]] = item[key] ?? ''
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

  // 设置列宽
  const colWidths = columns.map(col => ({ wch: col.width || 15 }))
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // 生成文件并下载
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 生成导入模板 Excel
 * 使用中英文双行表头，与用户提供的 Excel 格式一致
 */
export function generateImportTemplate(
  columns: ExcelColumn[],
  filename: string,
  sampleData?: Record<string, any>[]
): void {
  // 使用中英文双行表头（含\n换行），匹配用户的 Excel 格式
  const headerMap: Record<string, string> = {
    code: '零部件编码\nComponent code',
    name: '中文名称\nChinese Name',
    english_name: '英文名称\nEnglish Name',
    spec: '规格\nSpecification',
    qty: '数量\nQuantity',
    unit: '单位\nUnit',
    notes: '备注\nNotes',
    sale_price: '统一零售价\nUnified Retail Price',
    cost_price: '进货价格',
    stock_qty: '库存数',
    min_stock: '预警库存',
    category: '适用车型',
    location: '货位号',
  }

  const headers = columns.map(col => headerMap[col.key] || col.key)
  const worksheet = XLSX.utils.aoa_to_sheet([headers])

  // 如果有示例数据，添加几行示例
  if (sampleData && sampleData.length > 0) {
    const sampleRows = sampleData.map(item =>
      columns.map(col => item[col.key] ?? '')
    )
    sampleRows.forEach((row, idx) => {
      XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: { r: idx + 1, c: 0 } })
    })
  }

  const colWidths = columns.map(col => ({ wch: col.width || 20 }))
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_导入模板.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 验证导入数据格式
 */
export function validateImportData(
  rows: any[],
  requiredFields: string[],
  fieldTypes?: Record<string, 'string' | 'number' | 'date'>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  rows.forEach((row, index) => {
    const rowNum = index + 2 // 从第2行开始（第1行是表头）

    // 检查必填字段
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`第 ${rowNum} 行：缺少必填字段 "${field}"`)
      }
    })

    // 检查字段类型
    if (fieldTypes) {
      Object.entries(fieldTypes).forEach(([field, type]) => {
        const value = row[field]
        if (value === undefined || value === null || value === '') return

        if (type === 'number' && isNaN(Number(value))) {
          errors.push(`第 ${rowNum} 行：字段 "${field}" 必须是数字`)
        }
      })
    }
  })

  return { valid: errors.length === 0, errors }
}

/**
 * 入库指导单专用导出
 */
export function exportInOrderGuide(
  items: Array<{
    partCode: string
    partName: string
    spec: string
    unit: string
    location: string
    qty: number
    costPrice: number
  }>,
  orderNo: string,
  supplierName: string
): void {
  const columns: ExcelColumn[] = [
    { key: 'partCode', label: '配件编码', width: 18 },
    { key: 'partName', label: '配件名称', width: 25 },
    { key: 'spec', label: '规格型号', width: 20 },
    { key: 'unit', label: '单位', width: 8 },
    { key: 'location', label: '货位', width: 15 },
    { key: 'qty', label: '入库数量', width: 12 },
    { key: 'costPrice', label: '进货单价', width: 12 },
  ]

  const data = items.map(item => ({
    partCode: item.partCode,
    partName: item.partName,
    spec: item.spec,
    unit: item.unit,
    location: item.location || '待分配',
    qty: item.qty,
    costPrice: item.costPrice,
  }))

  // 添加汇总行
  const totalQty = data.reduce((sum, item) => sum + item.qty, 0)
  const totalAmount = data.reduce((sum, item) => sum + item.qty * item.costPrice, 0)

  exportToExcel(data, columns, `入库指导单_${orderNo}`, '入库指导单')

  // 这里可以扩展：生成带汇总和供应商信息的完整指导单
}