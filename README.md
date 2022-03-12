# TypeScript Labo

## 前提となるソフトウェア

- [Node.js](https://nodejs.org/ja/)
- [vscode](https://code.visualstudio.com/)
- [git](https://git-scm.com/)
- [yarn](https://yarnpkg.com/)

## プロジェクトの作成

```bash
$ yarn init -y
$ yarn install @types/node typescript
```

## tsconfig.json の作成

```bash
$ npx tsc --init
```

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "baseUrl": "./src",
    "baseUrl": "./src",
    "outDir": "./build",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["./src/**/*"]
}
```

## package.json の編集

```json
{
  "name": "typescript-labo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "NODE_PATH=./build node build/index.js",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "devDependencies": {
    "@types/node": "^17.0.21",
    "@types/ts-expose-internals": "npm:ts-expose-internals@4.1.5",
    "typescript": "^4.1.5"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

## src/index.ts を作成

```typescript
function hello(name: string): string {
  return `Hello, ${name}!`;
}
console.log(hello('Taro'));
```

## ビルド

**Cmd/Ctrl + Shift + B** キーを押下

または

```bash
$ yarn run build
```

## 実行

```bash
$ NODE_PATH=./build node build/index.js
```

## 依存関係技

```bash
$ npx ts-node src/dependency.ts ../../react-typescript-starter-app/src/index.tsx | tee temp-test.plantuml
```
