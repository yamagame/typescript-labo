# サーバーサイドプログラムの開発

## express モジュールのインストール

```bash
$ yarn add express @types/express
```

## nodemon モジュールのインストール

```bash
$ yarn add -D nodemon
```

## ts-node モジュールのインストール

```bash
$ yarn add -D ts-node
```

## package.json の編集

scripts に dev を追加

```json
  "scripts": {
                :
    "dev": "nodemon src/index.ts",
                :
  }
```

## 実行

```bash
$ yarn run dev
```

## src/index.ts の変更

```typescript
import express from "express";
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

http://localhost:3000 を開く
