<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTabs, ElTabPane, ElRow, ElCol, ElButton, ElTag, ElStatistic } from 'element-plus'
import { Tools, DataAnalysis, Document, Check, Clock, CircleCheck } from '@element-plus/icons-vue'
import { useWorkOrdersStore } from '@/stores/workOrders'
import { useRouter } from 'vue-router'
import List from './List.vue'

const router = useRouter()
const workOrdersStore = useWorkOrdersStore()
const activeTab = ref('list')

const stats = computed(() => ({
  total: workOrdersStore.workOrders.length,
  open: workOrdersStore.stats.open,
  inProgress: workOrdersStore.stats.in_progress,
  completed: workOrdersStore.stats.completed,
}))

onMounted(() => {
  workOrdersStore.loadWorkOrders()
})
</script>

<template>
  <div>
    <el-card class="mb-6">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;"><Tools /></div>
            <div class="stat-info">
              <h3>工单总数</h3>
              <el-statistic :value="stats.total" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;"><Clock /></div>
            <div class="stat-info">
              <h3>待派单</h3>
              <el-statistic :value="stats.open" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;"><Tools /></div>
            <div class="stat-info">
              <h3>维修中</h3>
              <el-statistic :value="stats.inProgress" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;"><CircleCheck /></div>
            <div class="stat-info">
              <h3>已完成</h3>
              <el-statistic :value="stats.completed" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="工单列表" name="list"><List /></el-tab-pane>
    </el-tabs>
  </div>
</template>