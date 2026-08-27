<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElRow, ElCol, ElCard, ElTag, ElButton, ElDescriptions, ElDescriptionsItem, ElLink } from 'element-plus'
import { Box, User, Monitor, Warning, Check, CircleClose, DataAnalysis, Tools, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { useCustomersStore } from '@/stores/customers'
import { useWorkOrdersStore } from '@/stores/workOrders'
import { useStockStore } from '@/stores/stock'
import { useRouter } from 'vue-router'

const router = useRouter()
const partsStore = usePartsStore()
const customersStore = useCustomersStore()
const workOrdersStore = useWorkOrdersStore()
const stockStore = useStockStore()

const stats = ref({
  totalParts: 0,
  lowStock: 0,
  outOfStock: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  inProgressOrders: 0,
  todayInAmount: 0,
  todayOutAmount: 0,
})

const recentWorkOrders = ref<any[]>([])

const statusTagMap = {
  open: { type: 'info' as const, text: '待派单' },
  in_progress: { type: 'warning' as const, text: '维修中' },
  completed: { type: 'success' as const, text: '已完成' },
  cancelled: { type: 'danger' as const, text: '已取消' },
}

const recentWorkOrdersWithTag = computed(() =>
  recentWorkOrders.value.map(order => ({
    ...order,
    statusTag: statusTagMap[order.status || ''] || { type: 'info', text: '未知' }
  }))
)

const recentStockLogs = ref<any[]>([])

const alertParts = computed(() => [
  ...partsStore.outOfStockParts.slice(0, 3),
  ...partsStore.lowStockParts.slice(0, 2),
])

function getStatusTag(status?: string) {
  return statusTagMap[status || ''] || { type: 'info', text: '未知' }
}

function navigateTo(path: string) {
  router.push(path)
}

async function loadDashboardData() {
  await Promise.all([
    partsStore.loadParts(),
    customersStore.loadCustomers(),
    workOrdersStore.loadWorkOrders(),
    stockStore.loadInOrders(),
    stockStore.loadOutOrders(),
  ])

  stats.value = {
    totalParts: partsStore.parts.length,
    lowStock: partsStore.lowStockParts.length,
    outOfStock: partsStore.outOfStockParts.length,
    totalCustomers: customersStore.customers.length,
    pendingOrders: workOrdersStore.stats.open,
    inProgressOrders: workOrdersStore.stats.in_progress,
    todayInAmount: 0,
    todayOutAmount: 0,
  }

  recentWorkOrders.value = workOrdersStore.workOrders.slice(0, 5)
  await stockStore.loadStockLogs()
  recentStockLogs.value = stockStore.stockLogs.slice(0, 10)
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
    </div>

    <el-row :gutter="20" class="mb-6">
<el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">
            <component :is="Box" />
          </div>
          <div class="stat-info">
            <h3>配件总数</h3>
            <span class="stat-value">{{ stats.totalParts }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
            <component :is="Warning" />
          </div>
          <div class="stat-info">
            <h3>库存预警</h3>
            <span class="stat-value">{{ stats.lowStock }}</span>
            <el-tag type="warning" size="small" @click="navigateTo('/inventory/parts')">查看详情</el-tag>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
            <component :is="CircleClose" />
          </div>
          <div class="stat-info">
            <h3>缺货配件</h3>
            <span class="stat-value">{{ stats.outOfStock }}</span>
            <el-tag type="danger" size="small" @click="navigateTo('/inventory/parts')">查看详情</el-tag>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">
            <component :is="User" />
          </div>
          <div class="stat-info">
            <h3>客户总数</h3>
            <span class="stat-value">{{ stats.totalCustomers }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #fce7f3; color: #db2777;">
            <component :is="Tools" />
          </div>
          <div class="stat-info">
            <h3>待派工单</h3>
            <span class="stat-value">{{ stats.pendingOrders }}</span>
            <el-tag type="info" size="small" @click="navigateTo('/work-orders/list')">去处理</el-tag>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">
            <component :is="Tools" />
          </div>
          <div class="stat-info">
            <h3>维修中工单</h3>
            <span class="stat-value">{{ stats.inProgressOrders }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <el-card class="detail-section">
          <h3 class="detail-section-title">最近工单</h3>
          <div v-if="recentWorkOrders.length === 0" class="text-center py-8 text-gray-400">
            暂无工单数据
          </div>
          <el-table v-else :data="recentWorkOrdersWithTag" border size="small" style="width: 100%">
            <el-table-column prop="order_no" label="工单号" width="160" />
            <el-table-column prop="vehicle_info" label="车辆信息" min-width="180" />
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.statusTag?.type || 'info'" effect="light">
                  {{ scope.row.statusTag?.text || '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="total_amount" label="金额" width="100">
              <template #default="scope">
                ¥{{ Number(scope.row.total_amount).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="160">
              <template #default="scope">
                {{ scope.row.created_at?.slice(0, 16).replace('T', ' ') }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button size="small" type="primary" link @click="navigateTo('/work-orders/detail/' + scope.row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card class="detail-section">
          <h3 class="detail-section-title">库存预警 TOP 5</h3>
          <div v-if="partsStore.lowStockParts.length === 0 && partsStore.outOfStockParts.length === 0" class="text-center py-8 text-gray-400">
            库存正常
          </div>
          <el-descriptions v-else border :column="1" size="small">
            <el-descriptions-item v-for="part in alertParts" :key="part.id" :label="part.name + ' (' + part.code + ')'">
              <el-tag :type="(part.stock_qty ?? 0) <= 0 ? 'danger' : 'warning'" effect="light">
                库存: {{ part.stock_qty ?? 0 }} {{ part.unit }} / 预警: {{ part.min_stock }} {{ part.unit }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <div class="mt-4 text-right">
            <el-button type="text" size="small" @click="navigateTo('/inventory/parts')">查看全部配件</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>