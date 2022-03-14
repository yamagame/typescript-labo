# TypeScript Deep Dive

## 内部関数のタイプモジュールをインストール

```bash
$ yarn add -D @types/ts-expose-internals
```

## TypeScript パーサーのテスト

```bash
$ NODE_PATH=./build node build/parser.js
```

## TypeScript パーサー(PlantUML 出力)

```bash
$ npx ts-node src/dependency.ts --mode=directory --baseDir=../../react-typescript-starter-app/src/ ../../react-typescript-starter-app/src/index.tsx | tee temp-test.plantuml
```

## TypeScript パーサー(JSON 出力)

```bash
$ npx ts-node src/parser.ts --mode="json" src/hello.tsx | tee src/temp-hello_test.json
```

## TypeScript パーサー(ソース出力)

```bash
$ npx ts-node src/parser.ts src/hello.tsx | tee src/temp-hello_test.tsx
```

## コンパイル例

```bash
$ npx tsc --esModuleInterop src/parser.ts
```
