#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const basePath = '';

const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

const exts = ['', '.ts', '.js', '.jsx', '.tsx'];
const srcDir = '../../react-typescript-starter-app/src/';

const removeRootDir = (srcDir: string, src: string) => {
  if (src.indexOf(srcDir) === 0) {
    return src.substring(srcDir.length);
  }
  return src;
};

const findFileWithExts = (makePathCallback: (ext: string) => string) => {
  let findFile = '';
  exts.some((ext) => {
    const filePath = makePathCallback(ext);
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
      findFile = filePath;
      return true;
    }
    return false;
  });
  return findFile;
};

const findFile = (basePath: string, filename: string) => {
  try {
    if (filename.startsWith('/')) return undefined;
    if (filename === '.') {
      {
        const file = findFileWithExts((ext) =>
          path.join(`${filename}/index${ext}`).normalize()
        );
        if (file) return file;
      }
      return undefined;
    }
    if (fs.existsSync(filename)) return filename;
    {
      const file = findFileWithExts((ext) =>
        path.join(`${filename}${ext}`).normalize()
      );
      if (file) return file;
    }
    {
      const file = findFileWithExts((ext) =>
        path.join(`${filename}/index${ext}`).normalize()
      );
      if (file) return file;
    }
    if (basePath === '') return undefined;
    {
      const file = findFileWithExts((ext) =>
        path.join(basePath, `${filename}${ext}`).normalize()
      );
      if (file) return file;
    }
    {
      const file = findFileWithExts((ext) =>
        path.join(basePath, `${filename}/index${ext}`).normalize()
      );
      if (file) return file;
    }
    {
      const file = findFileWithExts((ext) =>
        path.join(srcDir, `${filename}${ext}`).normalize()
      );
      if (file) return file;
    }
    {
      const file = findFileWithExts((ext) =>
        path.join(srcDir, `${filename}/index${ext}`).normalize()
      );
      if (file) return file;
    }
    // console.log(`## not found : ${basePath} : ${filename}`);
    return undefined;
  } catch (err) {
    console.error(err);
  }
  return undefined;
};

const cachedFiles: { [index: string]: string[] } = {};

const scanTypescriptAsync = async (srcPath: string) => {
  try {
    if (cachedFiles[srcPath]) {
      return;
    }
    // console.log(`${srcPath} -------------------------------------------`);
    const fileInfo = ts.preProcessFile(fs.readFileSync(srcPath).toString());
    const imports = fileInfo.importedFiles
      .map((file) => file.fileName)
      .map((file) => findFile(path.dirname(srcPath), file))
      .filter(isDefined);
    // console.log(imports);
    cachedFiles[srcPath] = imports;
    imports.forEach((importFile) => {
      scanTypescriptAsync(importFile);
    });
  } catch (err) {
    console.error(srcPath);
    console.error(err);
  }
};

const header = `@startuml dependencies
' title  React サンプルプロジェクト 依存関係図
skinparam shadowing false
scale 0.8
skinparam packageStyle Rectangle
left to right direction
`;

const footer = `@enduml
`;

async function main(processArgv: string[]) {
  const argv = yargs(hideBin(processArgv))
    .options({ _: { type: 'string' } })
    .demandCommand(1, 'You need at least one typescript source path')
    .help()
    .parseSync();

  const srcPath = argv._[0];
  await scanTypescriptAsync(srcPath);
  const result = Object.entries(cachedFiles).map(([src, imports]) => ({
    filename: removeRootDir(srcDir, src),
    imports: imports.map((src) => removeRootDir(srcDir, src)),
  }));
  console.log(header);

  result.forEach((src) => {
    console.log(
      `rectangle "${path.basename(src.filename)}" as ${src.filename.replace(
        /\//g,
        '_'
      )}`
    );
  });
  result.forEach((src) => {
    src.imports.forEach((file) =>
      console.log(
        `${src.filename.replace(/\//g, '_')} --> ${file.replace(/\//g, '_')}`
      )
    );
  });

  console.log(footer);
}

if (require.main === module) {
  main(process.argv);
}
