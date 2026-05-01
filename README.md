# Poker Log — PWA

テキサスホールデム ハンド履歴トラッカー（AI分析機能付き）

## ローカルで動かす

```bash
npm install
npm run dev
```

## Vercel にデプロイ（10分）

### 1. GitHubにアップロード
```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/ユーザー名/poker-log.git
git push -u origin main
```

### 2. Vercelでデプロイ
1. https://vercel.com → Add New Project → リポジトリ選択
2. Framework: **Vite** → Deploy

### 3. AI分析のAPIキー設定（必須）
1. https://console.anthropic.com でAPIキーを取得
2. Vercel → Settings → Environment Variables
3. `ANTHROPIC_API_KEY` = `sk-ant-xxxxx` を追加
4. Redeploy を実行

### 4. スマホにインストール
- **iPhone**: Safari → 共有 → ホーム画面に追加
- **Android**: Chrome → メニュー → ホーム画面に追加
