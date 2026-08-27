<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTable, ElTableColumn, ElButton, ElInput, ElTag, ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElUpload, ElProgress } from 'element-plus'
import { Plus, Edit, Delete, Search, Van, User, Phone, Location, Download, Upload } from '@element-plus/icons-vue'
import { useSuppliersStore } from '@/stores/suppliers'
import { parseExcelFile, generateImportTemplate, validateImportData, exportToExcel } from '@/utils/excel'
import type { Supplier } from '@/types'

const suppliersStore = useSuppliersStore()

const searchForm = ref({ keyword: '' })
const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentSupplier = ref<Partial<Supplier>>({})
const isEditing = ref(false)
const rules = ref({
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
})

const formRef = ref()

// 类型化表格数据 - 解决 el-table-column prop 类型推断问题
const tableData = computed<Supplier[]>(() => suppliersStore.filteredSuppliers)

async function loadData() {
  await suppliersStore.loadSuppliers()
}

function openAddDialog() {
  isEditing.value = false
  dialogTitle.value = '新增供应商'
  currentSupplier.value = {}
  dialogVisible.value = true
}

function openEditDialog(row: Supplier) {
  isEditing.value = true
  dialogTitle.value = '编辑供应商'
  currentSupplier.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (isEditing.value) {
        await suppliersStore.updateSupplier(currentSupplier.value.id!, currentSupplier.value)
        ElMessage.success('更新成功')
      } else {
        await suppliersStore.createSupplier(currentSupplier.value as Omit<Supplier, 'id' | 'created_at'>)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      await loadData()
    } catch (error: any) {
      console.error('[Suppliers] 保存失败:', error)
      ElMessage.error(error.message || '操作失败')
    }
  })
}

async function handleDelete(row: Supplier) {
  try {
    await ElMessageBox.confirm(`确定删除供应商 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await suppliersStore.deleteSupplier(row.id!)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e) {
    // 用户取消或出错时静默处理
  }
}

// Excel 导出
function exportData() {
  const data = suppliersStore.filteredSuppliers.map(p => ({
    供应商名称: p.name,
    联系人: p.contact || '',
    电话: p.phone || '',
    地址: p.address || '',
    备注: p.notes || '',
  }))
  exportToExcel(data,
    [
      { key: '供应商名称', label: '供应商名称', width: 20 },
      { key: '联系人', label: '联系人', width: 15 },
      { key: '电话', label: '电话', width: 15 },
      { key: '地址', label: '地址', width: 30 },
      { key: '备注', label: '备注', width: 20 },
    ],
    '供应商档案'
  )
}

// Excel 导入供应商档案
const importFile = ref<File | null>(null)
const importDialogVisible = ref(false)
const importProgress = ref(0)

async function handleFileChange(uploadFile: any) {
  importFile.value = uploadFile.raw || uploadFile
}

function handleExceed() {
  ElMessage.warning('仅支持单文件上传')
}

async function startImport() {
  if (!importFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  try {
    importProgress.value = 10
    const rows = await parseExcelFile(importFile.value)
    importProgress.value = 50

    // 验证数据
    const validation = validateImportData(rows, ['name'])
    if (!validation.valid) {
      ElMessage.error(validation.errors.join('; '))
      return
    }

    importProgress.value = 70

    // 逐行创建/更新供应商
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        const supplierData: Partial<Supplier> = {
          name: String(row.name || '').trim(),
          contact: String(row.contact || '').trim(),
          phone: String(row.phone || '').trim(),
          address: String(row.address || '').trim(),
          notes: String(row.notes || '').trim(),
        }

        if (!supplierData.name) {
          throw new Error('供应商名称不能为空')
        }

        // 检查是否已存在（按名称）
        const existing = suppliersStore.suppliers.find(s => s.name === supplierData.name)
        if (existing) {
          await suppliersStore.updateSupplier(existing.id!, supplierData)
        } else {
          await suppliersStore.createSupplier(supplierData as Omit<Supplier, 'id' | 'created_at'>)
        }
        success++
      } catch (error: any) {
        failed++
        errors.push(`第 ${rowNum} 行: ${error.message}`)
      }
    }

    importProgress.value = 100
    if (failed > 0) {
      ElMessage.warning(`导入完成：成功 ${success} 条，失败 ${failed} 条`)
      console.error('导入错误详情:', errors)
    } else {
      ElMessage.success(`成功导入 ${success} 条供应商数据`)
    }
    importDialogVisible.value = false
    importFile.value = null
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message)
  } finally {
    importProgress.value = 0
  }
}

function downloadSupplierTemplate() {
  generateImportTemplate(
    [
      { key: 'name', label: '供应商名称*', width: 20 },
      { key: 'contact', label: '联系人', width: 15 },
      { key: 'phone', label: '电话', width: 15 },
      { key: 'address', label: '地址', width: 30 },
      { key: 'notes', label: '备注', width: 20 },
    ],
    '供应商档案导入模板',
    [{ name: '北京某某配件有限公司', contact: '王经理', phone: '010-88888888', address: '北京市朝阳区xxx', notes: '主营发动机配件' }]
  )
}

function openImportDialog() {
  importDialogVisible.value = true
  importFile.value = null
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <el-card class="detail-section">
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="detail-section-title m-0">供应商列表</h3>
        <div class="flex gap-2">
          <el-button type="primary" icon="Upload" @click="openImportDialog">导入Excel</el-button>
          <el-button icon="Download" @click="downloadSupplierTemplate">下载模板</el-button>
          <el-button icon="Download" @click="exportData">导出</el-button>
          <el-button type="primary" icon="Plus" @click="openAddDialog">新增供应商</el-button>
        </div>
      </div>
    </template>

<el-form :model="searchForm" inline class="mb-4 search-form">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="名称/联系人/电话" prefix-icon="Search" clearable style="width: 300px" />
      </el-form-item>
    </el-form>

    <el-table :data="tableData" border size="small" style="width: 100%" v-loading="suppliersStore.loading">
      <el-table-column prop="name" label="供应商名称" width="180" />
      <el-table-column prop="contact" label="联系人" width="120" />
      <el-table-column prop="phone" label="电话" width="140">
        <template #default="scope">
          <el-tag effect="light" size="small" v-if="(scope.row as Supplier).phone">
            <Phone class="mr-1" />
            {{ (scope.row as Supplier).phone }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="200">
        <template #default="scope">
          <span v-if="(scope.row as Supplier).address" class="flex items-center gap-1 text-gray-600">
            <Location class="text-xs" />
            {{ (scope.row as Supplier).address }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="scope">{{ (scope.row as Supplier).created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="scope">
          <el-button size="small" link @click="openEditDialog(scope.row as Supplier)"><Edit />编辑</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(scope.row as Supplier)"><Delete />删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 导入供应商对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入供应商档案" width="500px" destroy-on-close>
      <div v-if="importProgress > 0 && importProgress < 100" class="mb-4">
        <el-progress :percentage="importProgress" status="success" />
      </div>
      <div v-else class="mb-4">
        <el-upload
          action="#"
          :on-change="handleFileChange"
          :show-file-list="true"
          :limit="1"
          :on-exceed="handleExceed"
          accept=".xlsx,.xls"
        >
          <el-button type="primary" icon="Upload">选择Excel文件</el-button>
          <template #tip>
            <div>仅支持 .xlsx/.xls 格式，必填列：供应商名称</div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="importProgress > 0" @click="startImport" :disabled="!importFile || importProgress > 0">开始导入</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form :model="currentSupplier" :rules="rules" label-width="100px" ref="formRef">
        <el-form-item label="名称" prop="name">
          <el-input v-model="currentSupplier.name" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="currentSupplier.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="currentSupplier.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="currentSupplier.address" type="textarea" :rows="2" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="currentSupplier.notes" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit(formRef)">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </el-card>
</template>