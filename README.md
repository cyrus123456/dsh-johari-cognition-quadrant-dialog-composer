# dsh-johari-cognition-quadrant-dialog-composer

乔哈里认知四象限对话梳理工具 / Johari cognition-quadrant dialog prompt composer — a DSH (DeepSeek Harness) Web UI plugin.

## 功能

在对话输入框上方添加一个「乔哈里四象限」按钮，点击后弹出一个 2×2 象限面板：

| 象限 | 位置 | 含义 |
|------|------|------|
| 我的隐藏区 | 左上 | 我知道 · AI不知道 — 需要告知 AI 的背景信息 |
| 共同未知区 | 右上 | 我不知道 · AI不知道 — 需要共同探索的问题 |
| 公开共识区 | 左下 | 我知道 · AI知道 — 双方共识的背景 |
| 我的盲区 | 右下 | 我不知道 · AI知道 — 希望 AI 教我的领域 |

- **横轴**（左→右）：我知道 → 我不知道
- **纵轴**（下→上）：AI知道 → AI不知道

填写后点击「生成 Prompt 并填入」，自动将四象限内容组合为结构化 Prompt 写入对话输入框。

## 安装

### 通过 dsh plugin add（推荐）

```bash
dsh plugin add cyrus123456/dsh-johari-cognition-quadrant-dialog-composer
```

### 从源码构建

```bash
git clone https://github.com/cyrus123456/dsh-johari-cognition-quadrant-dialog-composer.git
cd dsh-johari-cognition-quadrant-dialog-composer
pnpm install
pnpm run build
```

构建产物：
- `lib/index.js` — Host 端（Node 侧）
- `lib/client.js` — Client 端（浏览器侧，含 CSS 注入）

### 手动注册到 DSH Profile

1. 在 `profiles/web/node_modules/` 下创建指向本插件的 junction
2. 在 `profiles/web/package.json` 的 `dsh.profile.bundles` 数组中添加 `"dsh-johari-cognition-quadrant-dialog-composer"`
3. 重启 DSH

## 技术栈

- TypeScript + React 18
- esbuild 构建（兼容 Node 20+）
- CSS 运行时注入（`<style>` 标签，类名 `johari-` 前缀隔离）
- DSH Plugin API（`conversation.input.dock` 插槽）

## 文件结构

```
dsh-johari-cognition-quadrant-dialog-composer/
├── package.json
├── tsconfig.json
├── cordis.patch.yml          # DSH bundle 补丁
├── scripts/
│   └── build.mjs             # esbuild 构建脚本
├── src/
│   ├── index.ts              # Host 端入口
│   └── client/
│       ├── index.ts          # Client 端入口（插槽注册 + CSS 注入）
│       ├── JohariDockEntry.tsx  # 按钮 + 模态框 React 组件
│       ├── johari.css        # 插件样式（johari- 前缀）
│       └── css.d.ts          # CSS 文本导入类型声明
└── lib/                      # 构建产物（gitignore）
```
