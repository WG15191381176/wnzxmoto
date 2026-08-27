# 进销存管理系统 - Windows 桌面版

基于 **Tauri 2 + Vue 3 + TypeScript + SQLite** 开发的进销存管理软件，可打包为 Windows 原生安装包。

## 功能特性

- 📦 **库存管理** - 配件档案、库存查询、预警提醒
- 📥 **入库管理** - 采购入库、供应商管理、入库单据
- 📤 **出库管理** - 销售出库、维修领料、其他出库
- 👥 **客户档案** - 客户信息、车辆信息、历史工单
- 🔧 **维修工单** - 工单创建、配件领料、工时录入、结算
- 🚚 **供应商管理** - 供应商档案、联系信息
- 📊 **库存流水** - 完整的出入库记录追溯
- ⚙️ **系统设置** - 基础配置、业务参数、数据备份

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 (Rust + WebView2) |
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 数据库 | SQLite (tauri-plugin-sql) |
| 样式 | Tailwind CSS |
| 打包 | MSI / NSIS |

## 环境要求

- **Node.js** 20+
- **Rust** (via rustup)
- **pnpm** 9+
- **Windows 10/11** (构建目标)
- **WebView2 Runtime** (Windows 自带或需安装)

## 快速开始

### 1. 克隆/解压项目

```bash
cd inventory-manager
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 开发模式运行

```bash
pnpm tauri dev
```

### 4. 构建生产版本

```bash
# 方式一：使用构建脚本
chmod +x build.sh
./build.sh

# 方式二：手动构建
pnpm run build
pnpm tauri build
```

构建产物位于：
```
src-tauri/target/release/bundle/msi/进销存管理系统_1.0.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/进销存管理系统_1.0.0_x64-setup.exe
```

## 项目结构

```
inventory-manager/
├── src/
│   ├── main.ts                 # 入口文件
│   ├── App.vue                 # 根组件
│   ├── router/                 # 路由配置
│   ├── stores/                 # Pinia 状态管理
│   │   ├── parts.ts           # 配件/库存
│   │   ├── customers.ts       # 客户
│   │   ├── suppliers.ts       # 供应商
│   │   ├── stock.ts           # 入库/出库/流水
│   │   └── workOrders.ts      # 维修工单
│   ├── views/                 # 页面组件
│   │   ├── Dashboard.vue      # 仪表盘
│   │   ├── inventory/         # 库存管理
│   │   ├── customers/         # 客户档案
│   │   ├── workOrders/        # 维修工单
│   │   ├── suppliers/         # 供应商
│   │   └── Settings.vue       # 设置
│   ├── layouts/               # 布局组件
│   ├── utils/                 # 工具函数
│   ├── types/                 # TypeScript 类型
│   └── styles/                # 样式文件
├── src-tauri/                 # Tauri 后端
│   ├── src/main.rs           # Rust 入口
│   ├── migrations/           # 数据库迁移
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── build.sh                 # 构建脚本
```

## 数据库设计

核心表结构：
- `parts` - 配件档案 (编码、名称、规格、价格、库存、预警)
- `customers` - 客户档案 (姓名、电话、车辆、地址)
- `suppliers` - 供应商档案
- `in_orders` / `in_order_items` - 入库单及明细
- `out_orders` / `out_order_items` - 出库单及明细
- `work_orders` - 维修工单主表
- `work_order_parts` - 工单配件明细
- `work_order_labors` - 工单工时明细
- `stock_logs` - 库存流水 (审计追溯)

## 核心业务流程

### 维修工单流程
1. 创建工单 → 选择客户、填写车辆信息
2. 添加配件 → 搜索配件、录入数量 → **自动出库扣减库存**
3. 添加工时 → 选择项目、填工时/单价/技师
4. 完工结算 → 自动计算配件金额 + 工时金额 = 总额

### 入库流程
1. 新建入库单 → 选择供应商
2. 添加明细 → 选择配件、数量、进价
3. 保存 → 自动增加库存、记录流水

### 出库流程
- **销售出库**：关联客户，按售价出库
- **维修领料**：关联工单，按售价/自定义价出库
- **其他出库**：报损、领用等

## 常见问题

### Q: 构建失败提示找不到 WebView2？
A: Windows 10/11 通常自带。如缺失，请安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。

### Q: 数据库文件在哪里？
A: 运行时位于 `%APPDATA%/inventory-manager/inventory.db`。

### Q: 如何备份数据？
A: 直接复制 `inventory.db` 文件，或在设置中使用导出功能。

### Q: 支持多用户/局域网吗？
A: 当前为单机版。如需多用户，需部署后端 API + 共享数据库，预留了扩展接口。

## 扩展建议

- **报表统计**：销售报表、库存周转、技师绩效
- **权限管理**：角色权限、操作日志
- **条码扫描**：集成扫码枪快速入库/出库
- **打印模板**：自定义工单、出库单打印
- **云同步**：多店数据同步
- **微信通知**：工单状态变更推送

## 许可证

MIT License