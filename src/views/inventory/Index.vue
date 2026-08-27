<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTabs, ElTabPane, ElRow, ElCol, ElTag } from 'element-plus'
import { Box, Warning, CircleClose, DataAnalysis } from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { useRouter } from 'vue-router'
import Parts from './Parts.vue'
import InOrders from './InOrders.vue'
import OutOrders from './OutOrders.vue'
import StockLogs from './StockLogs.vue'

const router = useRouter()
const partsStore = usePartsStore()
const activeTab = ref('parts')

const stats = computed(() => ({
  total: partsStore.parts.length,
  warning: partsStore.lowStockParts.length,
  danger: partsStore.outOfStockParts.length,
}))

function navigateTo(path: string) {
  router.push(path)
}

onMounted(() => {
  partsStore.loadParts()
})
</script>

<template>
  <div>
    <el-card class="mb-6">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;"><component :is="Box" /></div>
            <div class="stat-info">
              <h3>配件总数</h3>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;"><component :is="Warning" /></div>
            <div class="stat-info">
              <h3>库存��警</h3>
              <span class="stat-value">{{ stats.warning }}</span>
              <el-tag type="warning" size="small" @click="navigateTo('/inventory/parts')">查看</el-tag>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #fee2e2; color: #ef4444;"><component :is="CircleClose" /></div>
            <div class="stat-info">
              <h3>��货配件</h3>
              <span class="stat-value">{{ stats.danger }}</span>
              <el-tag type="danger" size="small" @click="navigateTo('/inventory/parts')">查看</el-tag>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;"><component :is="DataAnalysis" /></div>
            <div class="stat-info">
              <h3>库存流水</h3>
              <span class="stat-value">0</span>
              <el-tag type="info" size="small" @click="navigateTo('/inventory/logs')">查看</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="配件列表" name="parts"><Parts /></el-tab-pane>
      <el-tab-pane label="入库管理" name="in"><InOrders /></el-tab-pane>
      <el-tab-pane label="出库管理" name="out"><OutOrders /></el-tab-pane>
      <el-tab-pane label="库存流水" name="logs"><StockLogs /></el-tab-pane>
    </el-tabs>
  </div>
</template>