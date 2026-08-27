<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTable, ElTableColumn, ElInput, ElSelect, ElOption, ElTag, ElDatePicker, ElForm, ElFormItem, ElButton, ElMessage, ElPagination } from 'element-plus'
import { Search, Download, Filter } from '@element-plus/icons-vue'
import { useStockStore } from '@/stores/stock'
import { usePartsStore } from '@/stores/parts'
import { exportToExcel } from '@/utils/excel'
import type { StockLog } from '@/types'

const stockStore = useStockStore()
const partsStore = usePartsStore()

const searchForm = ref({
  keyword: '',
  type: '',
  partId: undefined as number | undefined,
  dateRange: [] as [string, string] | [],
})
const loading = ref(false)
const logs = ref<StockLog[]>([])
const partsOptions = ref<any[]>([])
const partLabelMap = computed(() => {
  const map: Record<number, string> = {}
  partsOptions.value.forEach(p => { map[p.id] = p.label })
  return map
})
const typeTagMap = {
  in: { type: 'success' as const, text: '入库' },
  out: { type: 'danger' as const, text: '出库' },
  adjust: { type: 'warning' as const, text: '调整' },
}
const refTypeLabelMap = {
  in_order: '采购入库',
  out_order: '销售出库',
  work_order: '维修领料',
  adjust: '库存调整',
}

async function loadData() {
  loading.value = true
  try {
    await partsStore.loadParts()
    partsOptions.value = partsStore.parts.map(p => ({ id: p.id, label: `${p.name} (${p.code})` }))
    await stockStore.loadStockLogs({
      page: stockStore.stockLogPage,
      pageSize: stockStore.stockLogPageSize,
      partId: searchForm.value.partId,
      type: searchForm.value.type,
    })
    logs.value = stockStore.stockLogs
  } finally {
    loading.value = false
  }
}

function onSearch() {
  stockStore.stockLogPage = 1
  loadData()
}

function onPageChange(page: number) {
  stockStore.setStockLogPage(page)
}

function onPageSizeChange(size: number) {
  stockStore.setStockLogPageSize(size)
}

function filteredLogs() {
  let result = logs.value
  if (searchForm.value.keyword) {
    const kw = searchForm.value.keyword.toLowerCase()
    result = result.filter(log => {
      const part = partsOptions.value.find(p => p.id === log.part_id)
      return part?.label.toLowerCase().includes(kw) || log.remark?.toLowerCase().includes(kw)
    })
  }
  if (searchForm.value.type) {
    result = result.filter(log => log.type === searchForm.value.type)
  }
  if (searchForm.value.partId) {
    result = result.filter(log => log.part_id === searchForm.value.partId)
  }
  if (searchForm.value.dateRange.length === 2) {
    const [start, end] = searchForm.value.dateRange
    result = result.filter(log => log.created_at >= start && log.created_at <= end)
  }
  return result
}

function getTypeTag(type: string) {
  const map: Record<string, { type: 'success' | 'warning' | 'info' | 'danger', text: string }> = {
    in: { type: 'success', text: '入库' },
    out: { type: 'danger', text: '出库' },
    adjust: { type: 'warning', text: '调整' },
  }
  return map[type] || { type: 'info', text: type }
}

// 导出库存流水
function exportData() {
  const data = filteredLogs().map(log => ({
    时间: log.created_at?.slice(0, 19).replace('T', ' ') || '',
    配件: partLabelMap[log.part_id] || '未知配件',
    类型: typeTagMap[log.type as keyof typeof typeTagMap]?.text || log.type,
    数量: `${log.type === 'in' ? '+' : '-'}${log.qty}`,
    变更前: log.before_qty,
    变更后: log.after_qty,
    来源: refTypeLabelMap[log.ref_type as keyof typeof refTypeLabelMap] || log.ref_type || '-',
    单据号: log.ref_id ? `#${log.ref_id}` : '-',
    备注: log.remark || '',
  }))
  exportToExcel(data,
    [
      { key: '时间', label: '时间', width: 20 },
      { key: '配件', label: '配件', width: 25 },
      { key: '类型', label: '类型', width: 10 },
      { key: '数量', label: '数量', width: 10 },
      { key: '变更前', label: '变更前', width: 10 },
      { key: '变更后', label: '变更后', width: 10 },
      { key: '来源', label: '来源', width: 15 },
      { key: '单据号', label: '单据号', width: 12 },
      { key: '备注', label: '备注', width: 20 },
    ],
    '库存流水'
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
        <h3 class="detail-section-title m-0">库存流水</h3>
        <el-button icon="Download" @click="exportData">导出 Excel</el-button>
      </div>
    </template>

    <el-form :model="searchForm" inline class="mb-4 search-form">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="配件/备注" prefix-icon="Search" clearable style="width: 220px" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="searchForm.type" placeholder="流水类型" style="width: 130px" @change="onSearch">
          <el-option label="入库" value="in" />
          <el-option label="出库" value="out" />
          <el-option label="调整" value="adjust" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="searchForm.partId" placeholder="指定配件" style="width: 200px" filterable @change="onSearch">
          <el-option v-for="p in partsOptions" :key="p.id" :label="p.label" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-date-picker v-model="searchForm.dateRange" type="datetimerange" placeholder="日期范围" style="width: 300px" @change="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button icon="Search" @click="onSearch">查询</el-button>
        <el-button @click="searchForm.keyword=''; searchForm.type=''; searchForm.partId=undefined; searchForm.dateRange=[]; onSearch()">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="filteredLogs()" border size="small" style="width: 100%" v-loading="loading">
      <el-table-column prop="created_at" label="时间" width="170">
        <template #default="scope">{{ scope.row.created_at?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="配件" minWidth="180">
        <template #default="scope">
          {{ partLabelMap[scope.row.part_id] || '未知配件' }}
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="scope">
          <el-tag :type="typeTagMap[scope.row.type]?.type || 'info'" effect="light" size="small">{{ typeTagMap[scope.row.type]?.text || '未知' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="90">
        <template #default="scope">
          <span :class="scope.row.type === 'in' ? 'text-green-600' : 'text-red-600'">
            {{ scope.row.type === 'in' ? '+' : '-' }}{{ scope.row.qty }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="before_qty" label="变更前" width="90" />
      <el-table-column prop="after_qty" label="变更后" width="90" />
      <el-table-column label="来源" width="130">
        <template #default="scope">
          <span class="text-gray-500">{{ refTypeLabelMap[scope.row.ref_type] || scope.row.ref_type || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="ref_id" label="单据号" width="100">
        <template #default="scope">{{ scope.row.ref_id ? '#' + scope.row.ref_id : '-' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" minWidth="150" />
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="stockStore.stockLogPage"
      v-model:page-size="stockStore.stockLogPageSize"
      :page-sizes="[20, 50, 100, 200]"
      :total="stockStore.stockLogTotal"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @page-size-change="onPageSizeChange"
      class="mt-4"
    />
  </el-card>
</template>