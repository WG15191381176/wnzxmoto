<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTable, ElTableColumn, ElButton, ElInput, ElTag, ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElUpload, ElProgress, ElPagination } from 'element-plus'
import { Plus, Edit, Delete, Search, Van, Phone, Location, Document, Download, Upload } from '@element-plus/icons-vue'
import { useCustomersStore } from '@/stores/customers'
import { parseExcelFile, generateImportTemplate, validateImportData, exportToExcel } from '@/utils/excel'
import type { Customer } from '@/types'

const customersStore = useCustomersStore()

const searchForm = ref({ keyword: '' })
const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentCustomer = ref<Partial<Customer>>({})
const isEditing = ref(false)
const rules = ref({
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }],
})

const formRef = ref()

// 类型化表格数据 - 解决 el-table-column prop 类型推断问题
const tableData = computed<Customer[]>(() => customersStore.filteredCustomers)

async function loadData() {
  await customersStore.loadCustomers()
}

function openAddDialog() {
  isEditing.value = false
  dialogTitle.value = '新增客户'
  currentCustomer.value = {}
  dialogVisible.value = true
}

function openEditDialog(row: Customer) {
  isEditing.value = true
  dialogTitle.value = '编辑客户'
  currentCustomer.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (isEditing.value) {
        await customersStore.updateCustomer(currentCustomer.value.id!, currentCustomer.value)
        ElMessage.success('更新成功')
      } else {
        await customersStore.createCustomer(currentCustomer.value as Omit<Customer, 'id' | 'created_at'>)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      await loadData()
    } catch (error: any) {
      console.error('[Customers] 保存失败:', error)
      ElMessage.error(error.message || '操作失败')
    }
  })
}

async function handleDelete(row: Customer) {
  try {
    await ElMessageBox.confirm(`确定删除客户 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await customersStore.deleteCustomer(row.id!)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e) { }
}

function viewDetail(row: Customer) {
  // TODO: 客户详情弹窗，显示历史工单、消费记录
  ElMessage.info('客户详情功能开发中...')
}

// Excel 导出
function exportData() {
  const data = customersStore.filteredCustomers.map(p => ({
    姓名: p.name,
    电话: p.phone || '',
    地址: p.address || '',
    车辆信息: p.vehicle_info || '',
    联系人: p.contact_person || '',
    联系电话: p.contact_phone || '',
    发票抬头: p.invoice_title || '',
    税号: p.tax_id || '',
    开户行: p.bank_name || '',
    账号: p.bank_account || '',
    备注: p.notes || '',
  }))
  exportToExcel(data,
    [
      { key: '姓名', label: '姓名', width: 15 },
      { key: '电话', label: '电话', width: 15 },
      { key: '地址', label: '地址', width: 25 },
      { key: '车辆信息', label: '车辆信息', width: 20 },
      { key: '联系人', label: '联系人', width: 12 },
      { key: '联系电话', label: '联系电话', width: 15 },
      { key: '发票抬头', label: '发票抬头', width: 20 },
      { key: '税号', label: '税号', width: 20 },
      { key: '开户行', label: '开户行', width: 15 },
      { key: '账号', label: '账号', width: 20 },
      { key: '备注', label: '备注', width: 20 },
    ],
    '客户档案'
  )
}

// Excel 导入客户档案
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
    const validation = validateImportData(rows, ['name', 'phone'])
    if (!validation.valid) {
      ElMessage.error(validation.errors.join('; '))
      return
    }

    importProgress.value = 70

    // 逐行创建/更新客户
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        const customerData: Partial<Customer> = {
          name: String(row.name || '').trim(),
          phone: String(row.phone || '').trim(),
          address: String(row.address || '').trim(),
          vehicle_info: String(row.vehicle_info || '').trim(),
          contact_person: String(row.contact_person || '').trim(),
          contact_phone: String(row.contact_phone || '').trim(),
          invoice_title: String(row.invoice_title || '').trim(),
          tax_id: String(row.tax_id || '').trim(),
          bank_name: String(row.bank_name || '').trim(),
          bank_account: String(row.bank_account || '').trim(),
          notes: String(row.notes || '').trim(),
        }

        if (!customerData.name || !customerData.phone) {
          throw new Error('姓名和电话不能为空')
        }

        // 检查是否已存在（按手机号）
        const existing = customersStore.customers.find(c => c.phone === customerData.phone)
        if (existing) {
          await customersStore.updateCustomer(existing.id!, customerData)
        } else {
          await customersStore.createCustomer(customerData as Omit<Customer, 'id' | 'created_at'>)
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
      ElMessage.success(`成功导入 ${success} 条客户数据`)
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

function downloadCustomerTemplate() {
  generateImportTemplate(
    [
      { key: 'name', label: '姓名*', width: 15 },
      { key: 'phone', label: '电话*', width: 15 },
      { key: 'address', label: '地址', width: 25 },
      { key: 'vehicle_info', label: '车辆信息', width: 20 },
      { key: 'contact_person', label: '联系人', width: 12 },
      { key: 'contact_phone', label: '联系电话', width: 15 },
      { key: 'invoice_title', label: '发票抬头', width: 20 },
      { key: 'tax_id', label: '税号', width: 20 },
      { key: 'bank_name', label: '开户行', width: 15 },
      { key: 'bank_account', label: '账号', width: 20 },
      { key: 'notes', label: '备注', width: 20 },
    ],
    '客户档案导入模板',
    [{ name: '张三', phone: '13800138000', address: '北京市朝阳区xxx', vehicle_info: '丰田凯美瑞/京A12345', contact_person: '李四', contact_phone: '13900139000', invoice_title: '北京某某公司', tax_id: '91110105MA00000000', bank_name: '工商银行', bank_account: '6222080200012345678', notes: 'VIP客户' }]
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
        <h3 class="detail-section-title m-0">客户列表</h3>
        <div class="flex gap-2">
          <el-button type="primary" icon="Upload" @click="openImportDialog">导入Excel</el-button>
          <el-button icon="Download" @click="downloadCustomerTemplate">下载模板</el-button>
          <el-button icon="Download" @click="exportData">导出</el-button>
          <el-button type="primary" icon="Plus" @click="openAddDialog">新增客户</el-button>
        </div>
      </div>
    </template>

    <el-form :model="searchForm" inline class="mb-4 search-form">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="姓名/电话/车辆" prefix-icon="Search" clearable style="width: 300px" />
      </el-form-item>
    </el-form>

<el-table :data="tableData" border size="small" style="width: 100%" v-loading="customersStore.loading">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="电话" width="140">
        <template #default="scope">
          <el-tag effect="light" size="small" v-if="(scope.row as Customer).phone">
            <Phone class="mr-1" />
            {{ (scope.row as Customer).phone }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="vehicle_info" label="车辆信息" minWidth="200" />
      <el-table-column prop="address" label="地址" minWidth="180">
        <template #default="scope">
          <span v-if="(scope.row as Customer).address" class="flex items-center gap-1 text-gray-600">
            <Location class="text-xs" />
            {{ (scope.row as Customer).address }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="scope">{{ (scope.row as Customer).created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" link @click="viewDetail(scope.row as Customer)"><Document />详情</el-button>
          <el-button size="small" link @click="openEditDialog(scope.row as Customer)"><Edit />编辑</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(scope.row as Customer)"><Delete />删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 导入客户对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入客户档案" width="500px" destroy-on-close>
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
            <div>仅支持 .xlsx/.xls 格式，必填列：姓名、电话</div>
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
      <el-form :model="currentCustomer" :rules="rules" label-width="100px" ref="formRef">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="currentCustomer.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="currentCustomer.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="currentCustomer.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="车辆信息">
          <el-input v-model="currentCustomer.vehicle_info" placeholder="车型/车牌/VIN" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="currentCustomer.notes" type="textarea" :rows="3" placeholder="备注信息" />
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