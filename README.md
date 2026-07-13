# 我的記帳本

## 本機測試（需要先安裝 Node.js）
```
npm install
npm run dev
```
打開瀏覽器顯示的網址即可預覽。

## 部署到 Vercel（免費，取得公開網址）
1. 到 https://vercel.com 註冊帳號（可用 GitHub 帳號登入）
2. 把這個資料夾上傳到 GitHub（建立一個新的 repository，把檔案都放進去）
3. 在 Vercel 點「Add New Project」，選擇剛剛的 GitHub repository
4. Framework 選 **Vite**，其他設定用預設值即可，按「Deploy」
5. 部署完成後會拿到一個網址，例如 `https://my-expense-tracker.vercel.app`

## 用網址產生 APK
1. 到 https://www.pwabuilder.com
2. 貼上你的 Vercel 網址，按「Start」
3. 它會自動分析你的網站是不是符合 PWA 標準（這個專案已經設定好 manifest 和圖示，應該會通過）
4. 選擇 **Android** 平台，設定套件名稱（例如 com.yourname.expensetracker）
5. 按「Generate」，就會下載一個 APK 檔案

## 安裝到手機
1. 把產生的 APK 傳到手機（例如透過 Google Drive、LINE 傳檔案給自己）
2. 手機上打開檔案安裝（可能需要在設定裡允許「安裝不明來源的應用程式」）
3. 安裝完成後桌面就會有圖示，點開就是完整的 App

## 之後想上架 Google Play
PWABuilder 產生的 APK 可以進一步包裝成 Google Play 要求的 AAB 格式，同一個網站流程裡有「Store Package」選項可以選擇，需要另外申請 Google Play 開發者帳號（一次性費用，官方收取）。
