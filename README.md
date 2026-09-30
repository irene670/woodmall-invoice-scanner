<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 木百貨發票小幫手

使用 Gemini 辨識台灣三聯式發票、二聯式發票與收據，並整理成可直接貼到 Excel 的欄位。

專案採 Cloudflare Worker 提供前端與 API，Gemini API Key 僅存在 Cloudflare Secret，不會進入前端 bundle 或 Git 紀錄。

## 本地開發

**需求：** Node.js 20 以上、Cloudflare 帳號

1. 安裝依賴：`npm install`
2. 新增 `.dev.vars`，內容為 `GEMINI_API_KEY=您的金鑰`
3. 執行：`npm run dev`

## 部署

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

## 檢查

```bash
npm test
npm run typecheck
npm run build
```
