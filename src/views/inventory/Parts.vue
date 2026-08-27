<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElPagination,
} from 'element-plus'
import { Edit, Delete, Search, Warning, CircleClose, Download } from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { exportToExcel } from '@/utils/excel'
import { useRouter } from 'vue-router'
import type { Part } from '@/types'

const router = useRouter()
const partsStore = usePartsStore()

const searchForm = ref({
  keyword: '',
  category: '',
})
// 计算属性：给配件增加库存状态标签
const partsWithStockTag = computed(() =>
  partsStore.filteredParts.map(part => {
    let stockTag: { type: 'success' | 'warning' | 'danger', text: string, icon?: any }
    if (part.stock_qty <= 0) {
      stockTag = { type: 'danger', text: '缺货', icon: CircleClose }
    } else if (part.stock_qty <= part.min_stock && part.min_stock > 0) {
      stockTag = { type: 'warning', text: '预警', icon: Warning }
    } else {
      stockTag = { type: 'success', text: '正常' }
    }
    return { ...part, stockTag }
  })
)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentPart = ref<Partial<Part>>({})
const isEditing = ref(false)
const rules = ref({
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
})

const formRef = ref()

const columns = [
  { prop: 'code', label: '零部件编码\nComponent Code', width: 140 },
  { prop: 'name', label: '中文名称\nChinese Name', minWidth: 160 },
  { prop: 'english_name', label: '英文名称\nEnglish Name', minWidth: 160 },
  { prop: 'spec', label: '规格\nSpecification', minWidth: 120 },
  { prop: 'vehicle_qty', label: '原车数量\nVehicle Qty', width: 90 },
  { prop: 'unit', label: '单位\nUnit', width: 70 },
  { prop: 'stock_qty', label: '库存数量\nQuantity', width: 90 },
  { prop: 'notes', label: '备注\nNotes', minWidth: 120 },
  { prop: 'sale_price', label: '统一零售价\nUnified retail price', width: 110 },
  { prop: 'cost_price', label: '进货价格\nPurchase Price', width: 110 },
  { prop: 'location', label: '货位号\nLocation', width: 100 },
  { prop: 'min_stock', label: '预警库存\nMin Stock', width: 90 },
  { prop: 'category', label: '适用车型\nVehicle Models', minWidth: 120 },
]

async function loadData() {
  await partsStore.loadParts({
    page: partsStore.page,
    pageSize: partsStore.pageSize,
    search: searchForm.value.keyword,
    category: searchForm.value.category,
  })
}

function onSearch() {
  partsStore.page = 1
  loadData()
}

function onPageChange(page: number) {
  partsStore.setPage(page)
}

function onPageSizeChange(size: number) {
  partsStore.setPageSize(size)
}

function openAddDialog() {
  // 通过 Ribbon 或右键菜单新增，这里保留方法供兼容
  isEditing.value = false
  dialogTitle.value = '新增配件'
  currentPart.value = { unit: '个', cost_price: 0, sale_price: 0, stock_qty: 0, min_stock: 0, english_name: '', notes: '', spec: '', vehicle_qty: 1, category: '', location: '' }
  dialogVisible.value = true
}

function openEditDialog(row: Part) {
  isEditing.value = true
  dialogTitle.value = '编辑配件'
  currentPart.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (isEditing.value) {
        await partsStore.updatePart(currentPart.value.id!, currentPart.value)
        ElMessage.success('更新成功')
      } else {
        await partsStore.createPart(currentPart.value as Omit<Part, 'id' | 'created_at'>)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      await loadData()
    } catch (error: any) {
      console.error('[Parts] 保存失败:', error)
      ElMessage.error(error.message || '操作失败')
    }
  })
}

async function handleDelete(row: Part) {
  try {
    await ElMessageBox.confirm(`确定删除配件 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await partsStore.deletePart(row.id!)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e) {
    // 用户取消
  }
}

function getStockTag(qty: number, minStock: number) {
  if (qty <= 0) return { type: 'danger' as const, text: '缺货', icon: CircleClose }
  if (qty <= minStock && minStock > 0) return { type: 'warning' as const, text: '预警', icon: Warning }
  return { type: 'success' as const, text: '正常' }
}

// Excel 导出
function exportData() {
  const data = partsStore.filteredParts.map(p => ({
    '零部件编码': p.code,
    '中文名称': p.name,
    '英文名称': p.english_name || '',
    '规格': p.spec || '',
    '原车数量': p.vehicle_qty || 1,
    '单位': p.unit,
    '库存数量': p.stock_qty,
    '备注': p.notes || '',
    '统一零售价': p.sale_price,
    '进货价格': p.cost_price,
    '货位号': p.location || '',
    '预警库存': p.min_stock,
    '适用车型': p.category || '',
  }))
  exportToExcel(data,
    [
      { key: '零部件编码', label: '零部件编码', width: 18 },
      { key: '中文名称', label: '中文名称', width: 20 },
      { key: '英文名称', label: '英文名称', width: 20 },
      { key: '规格', label: '规格', width: 15 },
      { key: '原车数量', label: '原车数量', width: 10 },
      { key: '单位', label: '单位', width: 8 },
      { key: '库存数量', label: '库存数量', width: 10 },
      { key: '备注', label: '备注', width: 20 },
      { key: '统一零售价', label: '统一零售价', width: 12 },
      { key: '进货价格', label: '进货价格', width: 12 },
      { key: '货位号', label: '货位号', width: 15 },
      { key: '预警库存', label: '预警库存', width: 10 },
      { key: '适用车型', label: '适用车型', width: 25 },
    ],
    '配件基础数据'
  )
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <el-card class="detail-section">
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="detail-section-title m-0">配件列表</h3>
        <div class="flex gap-2">
          <el-button icon="Download" @click="exportData">导出</el-button>
        </div>
      </div>
    </template>

    <!-- 页面头部操作区 - 给新布局使用 -->
    <template #header-actions>
      <!-- 仅保留导出按钮，移除新增按钮 -->
    </template>
    <!-- 搜索栏 -->
    <el-form :model="searchForm" inline class="mb-4 search-form wps-card wps-card__body" style="padding: 16px;">
      <el-form-item>
        <el-input
          v-model="searchForm.keyword"
          placeholder="零部件编码/中文名称/英文名称/规格"
          prefix-icon="Search"
          clearable
          style="width: 280px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-select
          v-model="searchForm.category"
          placeholder="全部分类"
          style="width: 160px"
          @change="onSearch"
          filterable
        >
          <el-option v-for="cat in partsStore.categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button icon="Search" @click="onSearch">搜索</el-button>
        <el-button @click="searchForm.keyword=''; searchForm.category=''; onSearch()">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 配件列表表格 -->
    <el-card class="wps-card">
      <el-table :data="partsWithStockTag" border size="small" style="width: 100%" v-loading="partsStore.loading" row-key="id">
        <el-table-column v-for="col in columns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width" :min-width="col.minWidth">
          <template #default="scope" v-if="col.prop === 'stock_qty'">
            <span :class="['font-medium', scope.row.stock_qty <= 0 ? 'stock-out' : (scope.row.stock_qty <= scope.row.min_stock && scope.row.min_stock > 0 ? 'stock-warning' : 'stock-normal')]">
              {{ scope.row.stock_qty }}
            </span>
          </template>
          <template #default="scope" v-if="col.prop === 'cost_price' || col.prop === 'sale_price'">
            ¥{{ scope.row[col.prop].toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column label="库存状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.stockTag?.type || 'success'" effect="light" size="small">
              <component :is="scope.row.stockTag?.icon" class="mr-1" v-if="scope.row.stockTag?.icon" />
              {{ scope.row.stockTag?.text || '正常' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" link @click="openEditDialog(scope.row as Part)"><Edit />编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(scope.row as Part)"><Delete />删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="partsStore.page"
        v-model:page-size="partsStore.pageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="partsStore.total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="onPageChange"
        @page-size-change="onPageSizeChange"
        class="mt-4"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form :model="currentPart" :rules="rules" label-width="100px" ref="formRef">
        <el-form-item label="编码" prop="code">
          <el-input v-model="currentPart.code" :disabled="isEditing" placeholder="请输入编码/条码" />
        </el-form-item>
        <el-form-item label="中文名称" prop="name">
          <el-input v-model="currentPart.name" placeholder="请输入中文名称" />
        </el-form-item>
        <el-form-item label="英文名称" prop="english_name">
          <el-input v-model="currentPart.english_name" placeholder="请输入英文名称" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="currentPart.spec" placeholder="请输入规格型号" />
        </el-form-item>
        <el-form-item label="原车数量" prop="vehicle_qty">
          <el-input-number v-model="currentPart.vehicle_qty" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="currentPart.unit" placeholder="请选择单位" style="width: 100%">
            <el-option v-for="u in ['个', '套', '米', '千克', '升', '盒', '包', '卷']" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用车型" prop="category">
          <el-input v-model="currentPart.category" placeholder="请输入适用车型 (如 820RR, EFR01)" />
        </el-form-item>
        <el-form-item label="货位号" prop="location">
          <el-input v-model="currentPart.location" placeholder="请输入货位 (如 A-01-02)" />
        </el-form-item>
        <el-form-item label="进货价格">
          <el-input-number v-model="currentPart.cost_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="统一零售价">
          <el-input-number v-model="currentPart.sale_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="当前库存">
          <el-input-number v-model="currentPart.stock_qty" :min="0" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="预警库存">
          <el-input-number v-model="currentPart.min_stock" :min="0" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="currentPart.notes" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit(formRef)">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-container :deep(.el-card) {
  margin-bottom: 16px;
}

.page-container :deep(.el-table) {
  font-size: 13px;
}

.page-container :deep(.el-table__header-wrapper th) {
  background: var(--wps-bg-ribbon, #f8f9fa);
  color: var(--wps-text-tertiary, #6b7280);
  font-weight: 600;
  font-size: 12px;
}

.page-container :deep(.el-table__row:hover td) {
  background: var(--wps-bg-tertiary, #e8edf3);
}

.page-container :deep(.el-pagination) {
  padding-top: 16px;
  border-top: 1px solid var(--wps-border-light, #e0e6ed);
  margin-top: 8px;
}
</style>