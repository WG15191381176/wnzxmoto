/**
 * WPS Office 风格主题配置
 * 参考 WPS Office 经典界面设计语言
 */

export const wpsTheme = {
  // 主色调 - WPS 经典蓝
  colors: {
    primary: {
      50: '#e8f0fe',
      100: '#d1e3fd',
      200: '#a3c7fb',
      300: '#75aaf9',
      400: '#478ef7',
      500: '#2A7BE2',  // 主品牌色
      600: '#1e63b8',
      700: '#174d8e',
      800: '#143d72',
      900: '#11315a',
    },
    success: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      500: '#4caf50',
      600: '#43a047',
    },
    warning: {
      50: '#fff8e1',
      100: '#ffecb3',
      500: '#ffc107',
      600: '#ffb300',
    },
    danger: {
      50: '#fdeaea',
      100: '#fad2d2',
      500: '#f44336',
      600: '#e53935',
    },
    info: {
      50: '#e3f2fd',
      100: '#bbdefb',
      500: '#2196f3',
      600: '#1e88e5',
    },
    // 中性色
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    // 背景色
    bg: {
      primary: '#f0f4fa',      // 主背景 - WPS浅灰蓝
      secondary: '#ffffff',    // 卡片/面板背景
      tertiary: '#e8edf3',     // 悬停/选中背景
      header: '#ffffff',       // 顶栏背景
      sidebar: '#ffffff',      // 侧边栏背景
      ribbon: '#f8f9fa',       // Ribbon区域背景
    },
    // 边框色
    border: {
      light: '#e0e6ed',
      medium: '#cdd5e0',
      dark: '#a8b3c4',
      focus: '#2A7BE2',
    },
    // 文字色
    text: {
      primary: '#1a1d21',      // 主标题
      secondary: '#444a53',    // 正文
      tertiary: '#6b7280',     // 次要信息
      disabled: '#a0a8b4',     // 禁用态
      inverse: '#ffffff',      // 深色背景上的文字
      link: '#2A7BE2',         // 链接色
    },
    // Ribbon 选项卡
    ribbon: {
      tabActive: '#ffffff',
      tabHover: '#eef3fb',
      tabInactive: 'transparent',
      tabBorder: '#d6e4f0',
      groupBorder: '#d6e4f0',
      groupBg: '#f8f9fa',
    },
  },

  // 间距系统
  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    xxxl: '32px',
  },

  // 圆角
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '10px',
    xxl: '12px',
    full: '9999px',
  },

  // 阴影
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 2px 8px rgba(0, 0, 0, 0.06)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
    xl: '0 8px 24px rgba(0, 0, 0, 0.10)',
    inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
    ribbon: '0 1px 3px rgba(0, 0, 0, 0.05)',
    card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
  },

  // 字体
  typography: {
    fontFamily: {
      sans: "'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      lg: '14px',
      xl: '15px',
      '2xl': '16px',
      '3xl': '18px',
      '4xl': '20px',
      '5xl': '24px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.4,
      normal: 1.57,
      relaxed: 1.71,
    },
  },

  // 过渡动画
  transitions: {
    fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-index 层级
  zIndex: {
    dropdown: 100,
    sticky: 200,
    ribbon: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
    notification: 700,
  },

  // 断点
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // 布局尺寸
  layout: {
    headerHeight: '56px',
    ribbonHeight: '120px',
    ribbonTabHeight: '36px',
    sidebarWidth: '260px',
    sidebarCollapsedWidth: '64px',
    statusBarHeight: '28px',
    pagePadding: '16px',
    cardPadding: '16px',
  },
} as const

// 导出类型供 TypeScript 使用
export type WPSTheme = typeof wpsTheme
export type WPSColorScale = keyof typeof wpsTheme.colors.primary
export type WPSSpacing = keyof typeof wpsTheme.spacing
export type WPSBorderRadius = keyof typeof wpsTheme.borderRadius
export type WPSShadow = keyof typeof wpsTheme.shadows
export type WPSTypographySize = keyof typeof wpsTheme.typography.fontSize