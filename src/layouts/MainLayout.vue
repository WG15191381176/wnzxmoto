<script setup lang="ts">
// Tauri 窗口 API 类型声明
declare global {
  interface Window {
    __TAURI__?: {
      window: {
        current: () => {
          minimize: () => void
          maximize: () => void
          close: () => void
        }
      }
    }
  }
}

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ElMenu,
  ElSubMenu,
  ElMenuItem,
  ElMenuItemGroup,
  ElAvatar,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElButton,
  ElTooltip,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElTabs,
  ElTabPane,
  ElIcon,
} from 'element-plus'
import {
  Monitor,
  Box,
  User,
  Tools,
  Van,
  Setting,
  Fold,
  Expand,
  User as UserIcon,
  Lock,
  SwitchButton,
  HomeFilled,
  ArrowLeft,
  ArrowRight,
  Refresh,
  FullScreen,
  Close,
  Menu,
  More,
  Search,
  Bell,
  Message,
  Setting as SettingIcon,
  Help,
  Document,
  Download,
  Upload,
  Plus,
  Edit,
  Delete,
  Printer,
  Share,
  Star,
  Flag,
  Filter,
  Sort,
  Grid,
  List,
  View,
  Moon,
  Sunny,
  Lock as LockIcon,
  Unlock,
  ZoomIn,
  ZoomOut,
  Minus,
} from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { useCustomersStore } from '@/stores/customers'
import { useWorkOrdersStore } from '@/stores/workOrders'

const router = useRouter()
const route = useRoute()
const partsStore = usePartsStore()
const customersStore = useCustomersStore()
const workOrdersStore = useWorkOrdersStore()

const isCollapsed = ref(false)
const activeMenu = ref('/dashboard')
const userName = ref('管理员')
const activeRibbonTab = ref('home')
const breadcrumbItems = ref<Array<{ path: string; label: string }>>([])
const isFullscreen = ref(false)
const showQuickAccess = ref(false)
const zoomLevel = ref(1)

// 判断是否在 Tauri 环境中
const isTauri = computed(() => typeof window !== 'undefined' && window.__TAURI__ !== undefined)

// Ribbon 选项卡类型定义
interface RibbonItem {
  key: string
  label: string
  icon: any
  action: () => void
  shortcut?: string
  disabled?: boolean
  large?: boolean
}

interface RibbonGroup {
  label: string
  items: RibbonItem[]
}

interface RibbonTab {
  key: string
  label: string
  icon: any
  groups: RibbonGroup[]
}

// Ribbon 选项卡定义 - 参考 WPS Office 经典 Ribbon 设计
const ribbonTabs: RibbonTab[] = [
  {
    key: 'home',
    label: '开始',
    icon: HomeFilled,
    groups: [
      {
        label: '常用操作',
        items: [
          { key: 'new-work-order', label: '新建工单', icon: Plus, action: () => router.push('/work-orders/edit/new'), shortcut: 'Ctrl+N' } as RibbonItem,
          { key: 'new-part', label: '新增配件', icon: Box, action: () => router.push('/inventory/parts'), shortcut: 'Ctrl+P' } as RibbonItem,
          { key: 'new-customer', label: '新增客户', icon: User, action: () => router.push('/customers/list'), shortcut: 'Ctrl+U' } as RibbonItem,
          { key: 'new-in-order', label: '新建入库', icon: Download, action: () => router.push('/inventory/in'), shortcut: 'Ctrl+I' } as RibbonItem,
          { key: 'new-out-order', label: '新建出库', icon: Upload, action: () => router.push('/inventory/out'), shortcut: 'Ctrl+O' } as RibbonItem,
        ],
      },
      {
        label: '快速查看',
        items: [
          { key: 'dashboard', label: '仪表盘', icon: Monitor, action: () => router.push('/dashboard') } as RibbonItem,
          { key: 'parts', label: '配件列表', icon: Box, action: () => router.push('/inventory/parts') } as RibbonItem,
          { key: 'stock-logs', label: '库存流水', icon: Document, action: () => router.push('/inventory/logs') } as RibbonItem,
          { key: 'work-orders', label: '工单列表', icon: Tools, action: () => router.push('/work-orders/list') } as RibbonItem,
        ],
      },
      {
        label: '视图',
        items: [
          { key: 'toggle-sidebar', label: isCollapsed.value ? '展开侧栏' : '折叠侧栏', icon: isCollapsed.value ? Expand : Fold, action: () => isCollapsed.value = !isCollapsed.value } as RibbonItem,
          { key: 'refresh', label: '刷新数据', icon: Refresh, action: () => loadInitialData() } as RibbonItem,
          { key: 'fullscreen', label: isFullscreen.value ? '退出全屏' : '全屏', icon: FullScreen, action: toggleFullscreen } as RibbonItem,
        ],
      },
    ],
  },
  {
    key: 'inventory',
    label: '库存',
    icon: Box,
    groups: [
      {
        label: '入库管理',
        items: [
          { key: 'in-order', label: '入库单', icon: Download, action: () => router.push('/inventory/in') } as RibbonItem,
          { key: 'in-detail', label: '入库详情', icon: Document, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
      {
        label: '出库管理',
        items: [
          { key: 'out-order-sale', label: '销售出库', icon: Upload, action: () => router.push('/inventory/out?type=sale') } as RibbonItem,
          { key: 'out-order-repair', label: '维修领料', icon: Tools, action: () => router.push('/inventory/out?type=repair') } as RibbonItem,
          { key: 'out-order-other', label: '其他出库', icon: Box, action: () => router.push('/inventory/out?type=other') } as RibbonItem,
        ],
      },
      {
        label: '库存查询',
        items: [
          { key: 'parts', label: '配件列表', icon: Box, action: () => router.push('/inventory/parts') } as RibbonItem,
          { key: 'stock-logs', label: '库存流水', icon: Document, action: () => router.push('/inventory/logs') } as RibbonItem,
          { key: 'low-stock', label: '预警配件', icon: Flag, action: () => router.push('/inventory/parts?filter=low') } as RibbonItem,
        ],
      },
    ],
  },
  {
    key: 'business',
    label: '业务',
    icon: Tools,
    groups: [
      {
        label: '工单管理',
        items: [
          { key: 'work-order-list', label: '工单列表', icon: Document, action: () => router.push('/work-orders/list') } as RibbonItem,
          { key: 'work-order-new', label: '新建工单', icon: Plus, action: () => router.push('/work-orders/edit/new') } as RibbonItem,
          { key: 'work-order-pending', label: '待派工单', icon: Flag, action: () => router.push('/work-orders/list?status=open') } as RibbonItem,
          { key: 'work-order-progress', label: '维修中', icon: Refresh, action: () => router.push('/work-orders/list?status=in_progress') } as RibbonItem,
        ],
      },
      {
        label: '客户档案',
        items: [
          { key: 'customer-list', label: '客户列表', icon: User, action: () => router.push('/customers/list') } as RibbonItem,
          { key: 'customer-new', label: '新增客户', icon: Plus, action: () => router.push('/customers/list') } as RibbonItem,
        ],
      },
      {
        label: '供应商管理',
        items: [
          { key: 'supplier-list', label: '供应商列表', icon: Van, action: () => router.push('/suppliers/list') } as RibbonItem,
          { key: 'supplier-new', label: '新增供应商', icon: Plus, action: () => router.push('/suppliers/list') } as RibbonItem,
        ],
      },
    ],
  },
  {
    key: 'data',
    label: '数据',
    icon: Grid,
    groups: [
      {
        label: '导入导出',
        items: [
          { key: 'import-parts', label: '导入配件', icon: Upload, action: () => router.push('/inventory/parts'), disabled: false } as RibbonItem,
          { key: 'export-parts', label: '导出配件', icon: Download, action: () => {}, disabled: false } as RibbonItem,
          { key: 'import-customers', label: '导入客户', icon: Upload, action: () => router.push('/customers/list') } as RibbonItem,
          { key: 'export-customers', label: '导出客户', icon: Download, action: () => {}, disabled: false } as RibbonItem,
        ],
      },
      {
        label: '报表',
        items: [
          { key: 'stock-report', label: '库存报表', icon: Document, action: () => {}, disabled: true } as RibbonItem,
          { key: 'sales-report', label: '销售报表', icon: Document, action: () => {}, disabled: true } as RibbonItem,
          { key: 'work-order-report', label: '工单报表', icon: Document, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
      {
        label: '备份恢复',
        items: [
          { key: 'backup', label: '备份数据', icon: Download, action: () => {}, disabled: true } as RibbonItem,
          { key: 'restore', label: '恢复数据', icon: Upload, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
    ],
  },
  {
    key: 'view',
    label: '视图',
    icon: View,
    groups: [
      {
        label: '界面布局',
        items: [
          { key: 'compact', label: '紧凑模式', icon: Grid, action: () => {}, disabled: true } as RibbonItem,
          { key: 'comfortable', label: '舒适模式', icon: Grid, action: () => {}, disabled: true } as RibbonItem,
          { key: 'sidebar', label: isCollapsed.value ? '显示侧边栏' : '隐藏侧边栏', icon: isCollapsed.value ? Expand : Fold, action: () => isCollapsed.value = !isCollapsed.value } as RibbonItem,
        ],
      },
      {
        label: '主题',
        items: [
          { key: 'theme-light', label: '浅色模式', icon: Sunny, action: () => {}, disabled: true } as RibbonItem,
          { key: 'theme-dark', label: '深色模式', icon: Moon, action: () => {}, disabled: true } as RibbonItem,
          { key: 'theme-system', label: '跟随系统', icon: Monitor, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
      {
        label: '窗口',
        items: [
          { key: 'fullscreen', label: isFullscreen.value ? '退出全屏' : '全屏', icon: FullScreen, action: toggleFullscreen } as RibbonItem,
          { key: 'minimize', label: '最小化', icon: Minus, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
    ],
  },
  {
    key: 'help',
    label: '帮助',
    icon: Help,
    groups: [
      {
        label: '帮助与支持',
        items: [
          { key: 'help-doc', label: '帮助文档', icon: Document, action: () => {}, disabled: true } as RibbonItem,
          { key: 'shortcuts', label: '快捷键', icon: Search, action: () => {}, disabled: true } as RibbonItem,
          { key: 'feedback', label: '反馈建议', icon: Message, action: () => {}, disabled: true } as RibbonItem,
          { key: 'about', label: '关于 WNZXMOTO', icon: Star, action: () => {}, disabled: true } as RibbonItem,
        ],
      },
    ],
  },
]

// 侧边栏菜单项
const menuItems = [
  { path: '/dashboard', icon: Monitor, label: '仪表盘', key: 'dashboard' },
  { path: '/inventory', icon: Box, label: '库存管理', key: 'inventory', children: [
    { path: '/inventory/parts', label: '配件列表', key: 'parts' },
    { path: '/inventory/in', label: '入库管理', key: 'in' },
    { path: '/inventory/out', label: '出库管理', key: 'out' },
    { path: '/inventory/logs', label: '库存流水', key: 'logs' },
  ]},
  { path: '/customers', icon: User, label: '客户档案', key: 'customers', children: [
    { path: '/customers/list', label: '客户列表', key: 'customer-list' },
  ]},
  { path: '/work-orders', icon: Tools, label: '维修工单', key: 'work-orders', children: [
    { path: '/work-orders/list', label: '工单列表', key: 'work-order-list' },
  ]},
  { path: '/suppliers', icon: Van, label: '供应商管理', key: 'suppliers', children: [
    { path: '/suppliers/list', label: '供应商列表', key: 'supplier-list' },
  ]},
  { path: '/settings', icon: Setting, label: '系统设置', key: 'settings' },
]

async function loadInitialData() {
  await Promise.all([
    partsStore.loadParts(),
    customersStore.loadCustomers(),
    workOrdersStore.loadWorkOrders(),
  ])
}

onMounted(() => {
  loadInitialData()
  activeMenu.value = route.path
  updateBreadcrumb()
  // 监听路由变化更新面包屑
  watch(() => route.path, () => {
    activeMenu.value = route.path
    updateBreadcrumb()
    updateActiveRibbonTab()
  })
})

function updateBreadcrumb() {
  const matched = route.matched
  breadcrumbItems.value = matched
    .filter(m => m.meta.title)
    .map(m => ({ path: m.path, label: m.meta.title as string }))
}

function updateActiveRibbonTab() {
  const path = route.path
  if (path.startsWith('/inventory')) {
    activeRibbonTab.value = 'inventory'
  } else if (path.startsWith('/work-orders') || path.startsWith('/customers') || path.startsWith('/suppliers')) {
    activeRibbonTab.value = 'business'
  } else if (path === '/dashboard') {
    activeRibbonTab.value = 'home'
  } else if (path === '/settings') {
    activeRibbonTab.value = 'view'
  } else {
    activeRibbonTab.value = 'home'
  }
}

function handleMenuClick(routePath: string) {
  router.push(routePath)
  activeMenu.value = routePath
}

function handleSelect(index: string) {
  router.push(index)
}

function handleRibbonTabClick(tabKey: string) {
  activeRibbonTab.value = tabKey
}

function handleRibbonItemClick(item: RibbonItem) {
  if (item.disabled) return
  if (item.action) item.action()
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

function minimizeWindow() {
  if (window.__TAURI__) {
    window.__TAURI__.window.current().minimize()
  }
}

function closeWindow() {
  if (window.__TAURI__) {
    window.__TAURI__.window.current().close()
  }
}

function handleZoomChange(value: number) {
  zoomLevel.value = value
  document.body.style.zoom = `${value * 100}%`
}

function logout() {
  // TODO: 实现登出逻辑
}

function getRibbonTabGroups(tabKey: string) {
  const tab = ribbonTabs.find(t => t.key === tabKey)
  return tab?.groups || []
}

function getCurrentTabLabel() {
  const tab = ribbonTabs.find(t => t.key === activeRibbonTab.value)
  return tab?.label || '开始'
}
</script>

<template>
  <el-container class="wps-layout">
    <!-- 顶部标题栏 - 类似 WPS 顶部栏 -->
    <el-header class="wps-titlebar">
      <div class="titlebar-left">
        <el-button class="titlebar-btn" @click="isCollapsed = !isCollapsed" :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'">
          <el-icon><component :is="isCollapsed ? Expand : Fold" /></el-icon>
        </el-button>
        <div class="app-logo" :class="{ collapsed: isCollapsed }">
          <el-icon class="logo-icon"><Monitor /></el-icon>
          <span v-if="!isCollapsed" class="logo-text">WNZXMOTO</span>
        </div>
      </div>
      
      <div class="titlebar-center">
        <!-- 文件名/页面标题区域 -->
        <div class="page-title-area">
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="item.path" :to="item.path">
              {{ item.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>
      
      <div class="titlebar-right">
        <div class="titlebar-actions">
          <el-tooltip content="刷新数据" placement="bottom">
            <el-button class="titlebar-btn" @click="loadInitialData" circle><el-icon><Refresh /></el-icon></el-button>
          </el-tooltip>
          <el-tooltip content="通知" placement="bottom">
            <el-button class="titlebar-btn" circle><el-icon><Bell /></el-icon></el-button>
          </el-tooltip>
          <el-tooltip content="帮助文档" placement="bottom">
            <el-button class="titlebar-btn" circle><el-icon><Help /></el-icon></el-button>
          </el-tooltip>
          <el-tooltip content="设置" placement="bottom">
            <el-button class="titlebar-btn" @click="router.push('/settings')" circle><el-icon><SettingIcon /></el-icon></el-button>
          </el-tooltip>
        </div>
        <div class="user-area">
          <el-dropdown trigger="click">
            <span class="user-info flex items-center gap-2 cursor-pointer">
              <el-avatar :size="32" shape="circle" style="background: #dcfce7; color: #16a34a;">
                <el-icon><UserIcon /></el-icon>
              </el-avatar>
              <span class="hidden lg:block">{{ userName }}</span>
              <el-icon class="hidden lg:block"><SwitchButton /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item divided>
                  <el-icon class="mr-2"><UserIcon /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-icon class="mr-2"><SettingIcon /></el-icon>
                  设置
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-icon class="mr-2"><LockIcon /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <!-- 窗口控制按钮 (仅在 Tauri 环境) -->
        <div class="window-controls" v-if="isTauri">
          <el-button class="win-btn" circle @click="minimizeWindow"><el-icon><Minus /></el-icon></el-button>
          <el-button class="win-btn" circle @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></el-button>
          <el-button class="win-btn win-close" circle @click="closeWindow"><el-icon><Close /></el-icon></el-button>
        </div>
      </div>
    </el-header>

    <el-container class="wps-main-container">
      <!-- Ribbon 菜单栏 - WPS 核心特色 -->
      <div class="wps-ribbon" :class="{ collapsed: isCollapsed }">
        <!-- Ribbon 选项卡 -->
        <div class="ribbon-tabs">
          <div class="ribbon-tab-list" role="tablist">
            <button
              v-for="tab in ribbonTabs"
              :key="tab.key"
              class="ribbon-tab"
              :class="{ active: activeRibbonTab === tab.key }"
              role="tab"
              :aria-selected="activeRibbonTab === tab.key"
              @click="handleRibbonTabClick(tab.key)"
            >
              <el-icon class="tab-icon"><component :is="tab.icon" /></el-icon>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
            <!-- 快速访问工具栏区域 -->
            <div class="quick-access-toolbar">
              <el-tooltip content="保存" placement="bottom"><el-button class="qat-btn" circle><el-icon><Download /></el-icon></el-button></el-tooltip>
              <el-tooltip content="撤销" placement="bottom"><el-button class="qat-btn" circle disabled><el-icon><ArrowLeft /></el-icon></el-button></el-tooltip>
              <el-tooltip content="重做" placement="bottom"><el-button class="qat-btn" circle disabled><el-icon><ArrowRight /></el-icon></el-button></el-tooltip>
              <el-tooltip content="自定义快速访问工具栏" placement="bottom"><el-button class="qat-btn qat-more" circle @click="showQuickAccess = !showQuickAccess"><el-icon><More /></el-icon></el-button></el-tooltip>
            </div>
          </div>
        </div>
        
        <!-- Ribbon 内容区域 -->
        <div class="ribbon-content">
          <div class="ribbon-panel" v-if="getRibbonTabGroups(activeRibbonTab).length > 0">
            <div class="ribbon-groups">
              <div 
                v-for="group in getRibbonTabGroups(activeRibbonTab)" 
                :key="group.label" 
                class="ribbon-group"
              >
                <div class="group-buttons">
                  <button
                    v-for="item in group.items"
                    :key="item.key"
                    class="ribbon-btn"
                    :class="{ 'ribbon-btn-large': item.large, 'ribbon-btn-disabled': item.disabled }"
                    :disabled="item.disabled"
                    @click="handleRibbonItemClick(item)"
                    :title="item.shortcut ? `${item.label} (${item.shortcut})` : item.label"
                  >
                    <el-icon class="btn-icon" :class="{ large: item.large }"><component :is="item.icon" /></el-icon>
                    <span class="btn-label" v-if="!item.large">{{ item.label }}</span>
                    <div class="btn-content" v-if="item.large">
                      <span class="btn-label-large">{{ item.label }}</span>
                      <span class="btn-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
                    </div>
                  </button>
                </div>
                <div class="group-label">{{ group.label }}</div>
                <div class="group-divider" v-if="group.items.length > 0"></div>
              </div>
            </div>
          </div>
          <div class="ribbon-empty" v-else>
            <span class="empty-text">此选项卡暂无功能组</span>
          </div>
        </div>
        
        <!-- Ribbon 底部分隔线 -->
        <div class="ribbon-divider"></div>
      </div>

      <!-- 主内容区 -->
      <el-container class="wps-content-container">
        <!-- 左侧边栏 -->
        <el-aside :width="isCollapsed ? '64px' : '260px'" class="wps-sidebar transition-all duration-200">
          <el-menu
            :default-active="activeMenu"
            :collapse="isCollapsed"
            :unique-opened="true"
            :collapse-transition="false"
            router
            class="wps-nav-menu"
            @select="handleSelect"
          >
            <template v-for="item in menuItems" :key="item.path">
              <el-sub-menu v-if="item.children" :index="item.path">
                <template #title>
                  <el-icon><component :is="item.icon" /></el-icon>
                  <span>{{ item.label }}</span>
                </template>
                <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                  {{ child.label }}
                </el-menu-item>
              </el-sub-menu>
              <el-menu-item v-else :index="item.path">
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </el-aside>

        <!-- 右侧主内容 -->
        <el-container>
          <!-- 页面头部 - 面包屑 + 页面标题 + 操作按钮 -->
          <el-header class="wps-page-header">
            <div class="page-header-left">
              <h1 class="page-title">{{ route.meta.title || '页面' }}</h1>
            </div>
            <div class="page-header-right">
              <slot name="header-actions"></slot>
            </div>
          </el-header>
          
          <!-- 页面内容 -->
          <el-main class="wps-page-main">
            <slot />
          </el-main>
          
          <!-- 底部状态栏 -->
          <el-footer class="wps-statusbar">
            <div class="statusbar-left">
              <span class="status-item">就绪</span>
              <span class="status-divider">|</span>
              <span class="status-item">配件: {{ partsStore.total }} 项</span>
              <span class="status-divider">|</span>
              <span class="status-item">客户: {{ customersStore.customers.length }} 位</span>
              <span class="status-divider">|</span>
              <span class="status-item">工单: {{ workOrdersStore.total }} 单</span>
            </div>
            <div class="statusbar-center">
              <span class="status-item">WNZXMOTO 进销存管理系统 v1.0.0</span>
            </div>
            <div class="statusbar-right">
              <span class="status-item">编码: UTF-8</span>
              <span class="status-divider">|</span>
              <span class="status-item">
                <el-button class="status-btn" size="small" link @click="toggleFullscreen">
                  <el-icon><FullScreen /></el-icon>
                  {{ isFullscreen ? '退出全屏' : '全屏' }}
                </el-button>
              </span>
              <span class="status-divider">|</span>
              <span class="status-item">
                <el-select v-model="zoomLevel" class="zoom-select" size="small" style="width: 90px" @change="handleZoomChange">
                  <el-option label="75%" value="0.75" />
                  <el-option label="100%" value="1" />
                  <el-option label="125%" value="1.25" />
                  <el-option label="150%" value="1.5" />
                </el-select>
              </span>
            </div>
          </el-footer>
        </el-container>
      </el-container>
    </el-container>
  </el-container>
</template>

<style scoped>
/* WPS 布局核心样式 */
.wps-layout {
  height: 100vh;
  background: var(--wps-bg-primary, #f0f4fa);
  overflow: hidden;
}

/* 顶部标题栏 */
.wps-titlebar {
  height: 56px;
  background: var(--wps-bg-header, #ffffff);
  border-bottom: 1px solid var(--wps-border-light, #e0e6ed);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-shadow: var(--wps-shadow-ribbon);
  z-index: 300;
  position: relative;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.titlebar-btn:hover {
  background: var(--wps-bg-tertiary, #e8edf3);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  height: 36px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.app-logo:hover {
  background: var(--wps-bg-tertiary, #e8edf3);
}
.app-logo.collapsed {
  justify-content: center;
  padding: 0;
}
.logo-icon {
  font-size: 20px;
  color: var(--wps-primary-500, #2A7BE2);
}
.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--wps-primary-600, #1e63b8);
  white-space: nowrap;
}

.titlebar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 600px;
}

.page-title-area {
  max-width: 500px;
}

.breadcrumb {
  font-size: 13px;
}
.breadcrumb :deep(.el-breadcrumb__inner) {
  color: var(--wps-text-secondary, #444a53);
}
.breadcrumb :deep(.el-breadcrumb__inner:hover) {
  color: var(--wps-primary-500, #2A7BE2);
}
.breadcrumb :deep(.el-breadcrumb__inner.is-link) {
  color: var(--wps-primary-500, #2A7BE2);
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-actions {
  display: flex;
  gap: 4px;
}

.user-area {
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid var(--wps-border-light, #e0e6ed);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.user-info:hover {
  background: var(--wps-bg-tertiary, #e8edf3);
}

.window-controls {
  display: flex;
  gap: 2px;
  margin-left: 8px;
}

.win-btn {
  width: 36px;
  height: 28px;
  border-radius: 0;
  background: transparent;
}
.win-btn:hover {
  background: var(--wps-bg-tertiary, #e8edf3);
}
.win-close:hover {
  background: #f44336 !important;
  color: white !important;
}

/* Ribbon 菜单栏 */
.wps-ribbon {
  height: 120px;
  background: var(--wps-bg-ribbon, #f8f9fa);
  border-bottom: 1px solid var(--wps-border-light, #e0e6ed);
  display: flex;
  flex-direction: column;
  z-index: 200;
  overflow: hidden;
}

.ribbon-tabs {
  height: 36px;
  display: flex;
  align-items: stretch;
  padding: 0 8px;
  background: var(--wps-bg-header, #ffffff);
  border-bottom: 1px solid var(--wps-border-light, #e0e6ed);
}

.ribbon-tab-list {
  display: flex;
  align-items: stretch;
  flex: 1;
  gap: 2px;
}

.ribbon-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 100%;
  background: transparent;
  border: none;
  border-radius: 6px 6px 0 0;
  color: var(--wps-text-secondary, #444a53);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  margin-bottom: -1px;
}
.ribbon-tab:hover:not(.active) {
  background: var(--wps-ribbon-tabHover, #eef3fb);
  color: var(--wps-primary-500, #2A7BE2);
}
.ribbon-tab.active {
  background: var(--wps-ribbon-tabActive, #ffffff);
  color: var(--wps-primary-600, #1e63b8);
  border-left: 1px solid var(--wps-ribbon-tabBorder, #d6e4f0);
  border-right: 1px solid var(--wps-ribbon-tabBorder, #d6e4f0);
  border-top: 2px solid var(--wps-primary-500, #2A7BE2);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.03);
}
.ribbon-tab .tab-icon {
  font-size: 16px;
}

.quick-access-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
}

.qat-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: var(--wps-text-secondary, #444a53);
}
.qat-btn:hover:not(:disabled) {
  background: var(--wps-bg-tertiary, #e8edf3);
  color: var(--wps-primary-500, #2A7BE2);
}
.qat-more {
  margin-left: 4px;
}

/* Ribbon 内容区域 */
.ribbon-content {
  flex: 1;
  padding: 6px 8px;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: stretch;
}

.ribbon-panel {
  display: flex;
  align-items: stretch;
  height: 100%;
  min-width: max-content;
}

.ribbon-groups {
  display: flex;
  align-items: stretch;
  height: 100%;
  gap: 4px;
}

.ribbon-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  border-right: 1px solid var(--wps-ribbon-groupBorder, #d6e4f0);
  background: var(--wps-ribbon-groupBg, #f8f9fa);
  border-radius: 4px;
  min-width: 60px;
}

.group-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 2px;
  padding-top: 4px;
}

.ribbon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--wps-text-secondary, #444a53);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s ease;
  min-width: 56px;
}
.ribbon-btn:hover:not(.ribbon-btn-disabled) {
  background: var(--wps-primary-50, #e8f0fe);
  color: var(--wps-primary-600, #1e63b8);
}
.ribbon-btn:active:not(.ribbon-btn-disabled) {
  background: var(--wps-primary-100, #d1e3fd);
}
.ribbon-btn.ribbon-btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ribbon-btn-large {
  flex-direction: column;
  padding: 6px 10px;
  min-width: 64px;
}

.btn-icon {
  font-size: 16px;
  margin-bottom: 2px;
}
.btn-icon.large {
  font-size: 24px;
  margin-bottom: 2px;
}

.btn-label {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.btn-label-large {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

.btn-shortcut {
  font-size: 9px;
  color: var(--wps-text-tertiary, #6b7280);
  font-family: var(--wps-font-mono);
}

.group-label {
  font-size: 10px;
  color: var(--wps-text-tertiary, #6b7280);
  margin-top: 4px;
  text-align: center;
  white-space: nowrap;
}

.group-divider {
  width: 1px;
  height: 100%;
  background: var(--wps-ribbon-groupBorder, #d6e4f0);
  margin-left: 8px;
}

.ribbon-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wps-text-tertiary, #6b7280);
  font-size: 12px;
}

.ribbon-divider {
  height: 2px;
  background: linear-gradient(90deg, var(--wps-primary-200, #a3c7fb), var(--wps-primary-400, #478ef7), var(--wps-primary-200, #a3c7fb));
}

/* 主内容容器 */
.wps-main-container {
  flex: 1;
  overflow: hidden;
}

.wps-content-container {
  height: 100%;
}

/* 侧边栏 */
.wps-sidebar {
  background: var(--wps-bg-sidebar, #ffffff);
  border-right: 1px solid var(--wps-border-light, #e0e6ed);
  overflow-y: auto;
  height: 100%;
}

.wps-nav-menu {
  padding: 8px;
  border: none;
  background: transparent;
}

.wps-nav-menu :deep(.el-menu-item) {
  border-radius: 8px;
  margin: 2px 4px;
  height: 38px;
  line-height: 38px;
  font-size: 13px;
  color: var(--wps-text-secondary, #444a53);
  transition: all 0.15s ease;
}
.wps-nav-menu :deep(.el-menu-item:hover) {
  background: var(--wps-primary-50, #e8f0fe);
  color: var(--wps-primary-600, #1e63b8);
}
.wps-nav-menu :deep(.el-menu-item.is-active) {
  background: var(--wps-primary-100, #d1e3fd);
  color: var(--wps-primary-700, #174d8e);
  font-weight: 600;
}
.wps-nav-menu :deep(.el-menu-item.is-active:hover) {
  background: var(--wps-primary-100, #d1e3fd);
  color: var(--wps-primary-700, #174d8e);
}

.wps-nav-menu :deep(.el-sub-menu__title) {
  height: 38px;
  line-height: 38px;
  font-size: 13px;
  padding: 0 12px;
  border-radius: 8px;
  margin: 2px 4px;
  color: var(--wps-text-secondary, #444a53);
  transition: all 0.15s ease;
}
.wps-nav-menu :deep(.el-sub-menu__title:hover) {
  background: var(--wps-primary-50, #e8f0fe);
  color: var(--wps-primary-600, #1e63b8);
}
.wps-nav-menu :deep(.el-sub-menu__title.is-opened) {
  background: var(--wps-primary-50, #e8f0fe);
  color: var(--wps-primary-600, #1e63b8);
  font-weight: 600;
}

.wps-nav-menu :deep(.el-menu--collapse .el-sub-menu__title) {
  padding: 0;
  justify-content: center;
}
.wps-nav-menu :deep(.el-menu--collapse .el-menu-item) {
  padding: 0;
  justify-content: center;
}

/* 页面头部 */
.wps-page-header {
  height: 56px;
  background: var(--wps-bg-header, #ffffff);
  border-bottom: 1px solid var(--wps-border-light, #e0e6ed);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: var(--wps-shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--wps-text-primary, #1a1d21);
  margin: 0;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 页面主体 */
.wps-page-main {
  flex: 1;
  background: var(--wps-bg-primary, #f0f4fa);
  padding: 20px;
  overflow-y: auto;
}

/* 底部状态栏 */
.wps-statusbar {
  height: 28px;
  background: var(--wps-bg-header, #ffffff);
  border-top: 1px solid var(--wps-border-light, #e0e6ed);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 11px;
  color: var(--wps-text-tertiary, #6b7280);
}

.statusbar-left,
.statusbar-center,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-divider {
  color: var(--wps-border-medium, #cdd5e0);
}

.status-btn {
  padding: 0 8px !important;
  height: 20px !important;
  line-height: 1 !important;
  font-size: 10px !important;
}

.zoom-select :deep(.el-input__inner) {
  height: 22px;
  font-size: 11px;
  padding: 0 8px;
  text-align: center;
}
.zoom-select :deep(.el-select__suffix) {
  font-size: 10px;
}

/* 折叠状态下的调整 */
.wps-ribbon.collapsed .ribbon-tab .tab-label {
  display: none;
}
.wps-ribbon.collapsed .ribbon-tab {
  padding: 0 12px;
  justify-content: center;
}
.wps-ribbon.collapsed .quick-access-toolbar {
  padding-right: 4px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .wps-ribbon {
    height: auto;
    min-height: 120px;
  }
  .ribbon-content {
    flex-wrap: wrap;
    padding-bottom: 10px;
  }
  .ribbon-group {
    border-right: none;
    border-bottom: 1px solid var(--wps-ribbon-groupBorder, #d6e4f0);
    padding: 8px;
    min-width: 80px;
  }
  .group-divider {
    display: none;
  }
}

@media (max-width: 768px) {
  .titlebar-center {
    display: none;
  }
  .user-area span:not(.el-avatar) {
    display: none;
  }
  .page-header-left {
    display: none;
  }
  .statusbar-left,
  .statusbar-center {
    display: none;
  }
}
</style>