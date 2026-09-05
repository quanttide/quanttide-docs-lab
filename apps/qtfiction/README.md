# 量潮小说

网络文学 · 小说发布平台。按系列组织小说内容，支持在线阅读。

## 内容来源

小说正文来自 [quanttide-fiction-of-founder](https://github.com/quanttide/quanttide-fiction-of-founder) 数据源。当前收录：

- **职场言情**：短篇言情合集（改稿/初稿）
- **校园言情**：章节式长篇
- **重生言情**：章节式

数据通过 `assets/fiction` 同步到 `data/series/`（见 `scripts/sync-data.sh`）。

## 技术栈

- React 19 + TypeScript
- Vite 6

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```
