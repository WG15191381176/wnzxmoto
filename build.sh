#!/bin/bash
# 构建脚本 - 在 WSL 中运行

set -e

echo "======================================"
echo "进销存管理系统 - Windows 构建脚本"
echo "======================================"

# 检查环境
echo "检查 Node.js 版本..."
node --version

echo "检查 Rust 版本..."
rustc --version

echo "检查 pnpm..."
pnpm --version

# 安装依赖
echo ""
echo "安装前端依赖..."
pnpm install

# 构建前端
echo ""
echo "构建前端..."
pnpm run build

# 构建 Tauri 应用
echo ""
echo "构建 Tauri 应用 (生成 .msi)..."
pnpm tauri build

echo ""
echo "======================================"
echo "构建完成！"
echo "安装包位置: src-tauri/target/release/bundle/msi/"
echo "======================================"