<script setup lang="ts">
import { ref } from 'vue'
import { ElCard, ElForm, ElFormItem, ElInput, ElInputNumber, ElSelect, ElOption, ElSwitch, ElButton, ElDivider, ElMessage, ElDescriptions, ElDescriptionsItem, ElRow, ElCol } from 'element-plus'
import { Check, Refresh, Monitor, Download, Upload, Setting, DataBoard, Delete } from '@element-plus/icons-vue'

const settings = ref({
  shopName: '本地修理厂',
  shopPhone: '',
  shopAddress: '',
  defaultTaxRate: 0.13,
  defaultLaborRate: 200,
  autoBackup: true,
  backupInterval: 7,
  printTemplate: 'default',
  lowStockAlert: true,
})

const tabs = [
  { name: 'basic', label: '基础设置', icon: Setting },
  { name: 'business', label: '业务参数', icon: DataBoard },
  { name: 'backup', label: '数据备份', icon: Monitor },
  { name: 'print', label: '打印模板', icon: Download },
]

const activeTab = ref('basic')

async function saveSettings() {
  // TODO: 保存到本地存储或数据库配置表
  ElMessage.success('设置保存成功')
}

function exportData() {
  // TODO: 导出全量数据 SQL/JSON
  ElMessage.info('导出功能开发中...')
}

function importData() {
  // TODO: 导入数据
  ElMessage.info('导入功能开发中...')
}

function backupNow() {
  // TODO: 手动备份
  ElMessage.info('备份功能开发中...')
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="detail-section-title m-0">系统设置</h3>
          <el-button type="primary" icon="Check" @click="saveSettings">保存设置</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane v-for="tab in tabs" :key="tab.name" :label="tab.label" :name="tab.name">
          <component :is="tab.icon" class="mr-1" />
        </el-tab-pane>
      </el-tabs>

      <!-- 基础设置 -->
      <el-form v-if="activeTab === 'basic'" :model="settings" label-width="140px" class="mt-4 space-y-4">
        <el-divider content-position="left">店铺信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="店铺名称">
              <el-input v-model="settings.shopName" placeholder="请输入店铺名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="settings.shopPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="店铺地址">
              <el-input v-model="settings.shopAddress" type="textarea" :rows="2" placeholder="请输入详细地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">系统偏好</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="默认税率">
              <el-input-number v-model="settings.defaultTaxRate" :precision="2" :step="0.01" :min="0" :max="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认工时单价">
              <el-input-number v-model="settings.defaultLaborRate" :min="0" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="库存预警提醒">
              <el-switch v-model="settings.lowStockAlert" active-value="true" inactive-value="false" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 业务参数 -->
      <el-form v-else-if="activeTab === 'business'" :model="settings" label-width="140px" class="mt-4 space-y-4">
        <el-divider content-position="left">价格体系</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="默认工时单价 (元/小时)">
              <el-input-number v-model="settings.defaultLaborRate" :min="0" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认税率">
              <el-select v-model="settings.defaultTaxRate" placeholder="请选择" style="width: 100%">
                <el-option label="免税 (0%)" :value="0" />
                <el-option label="简易计税 (3%)" :value="0.03" />
                <el-option label="一般计税 (13%)" :value="0.13" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">库存管理</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="启用库存预警">
              <el-switch v-model="settings.lowStockAlert" active-value="true" inactive-value="false" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 数据备份 -->
      <div v-else-if="activeTab === 'backup'" class="mt-4 space-y-4">
        <el-card>
          <template #header>
            <h4 class="m-0">数据备份与恢复</h4>
          </template>
          <el-descriptions border :column="2" size="small">
            <el-descriptions-item label="数据库文件">inventory.db (应用数据目录)</el-descriptions-item>
            <el-descriptions-item label="自动备份">开启</el-descriptions-item>
            <el-descriptions-item label="备份间隔">每 7 天</el-descriptions-item>
            <el-descriptions-item label="最后备份时间">-</el-descriptions-item>
          </el-descriptions>
          <div class="flex gap-2 mt-4">
            <el-button type="primary" icon="Monitor" @click="backupNow">立即备份</el-button>
            <el-button icon="Download" @click="exportData">导出数据</el-button>
            <el-button icon="Upload" @click="importData">导入数据</el-button>
          </div>
        </el-card>

        <el-card class="mt-4">
          <template #header>
            <h4 class="m-0">危险操作</h4>
          </template>
          <el-descriptions border :column="1" size="small">
            <el-descriptions-item label="说明">以下操作不可恢复，请谨慎操作</el-descriptions-item>
          </el-descriptions>
          <div class="flex gap-2 mt-4">
            <el-button type="danger" icon="Refresh">清空所有数据</el-button>
            <el-button type="danger" icon="Delete">重置数据库</el-button>
          </div>
        </el-card>
      </div>

      <!-- 打印模板 -->
      <div v-else-if="activeTab === 'print'" class="mt-4 space-y-4">
        <el-card>
          <template #header>
            <h4 class="m-0">打印模板设置</h4>
          </template>
          <el-form :model="settings" label-width="120px">
            <el-form-item label="默认模板">
              <el-select v-model="settings.printTemplate" placeholder="请选择" style="width: 100%">
                <el-option label="标准模板" value="default" />
                <el-option label="简洁模板" value="simple" />
                <el-option label="详细模板" value="detailed" />
              </el-select>
            </el-form-item>
            <el-form-item label="页眉内容">
              <el-input v-model="settings.shopName" placeholder="页眉显示的店铺名称" />
            </el-form-item>
            <el-form-item label="页脚备注">
              <el-input v-model="settings.shopAddress" type="textarea" :rows="2" placeholder="页脚备注信息" />
            </el-form-item>
          </el-form>
          <div class="flex gap-2 mt-4">
            <el-button type="primary" icon="Download">预览模板</el-button>
            <el-button icon="Setting">编辑模板</el-button>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>