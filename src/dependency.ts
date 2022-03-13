#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type PromiseReturnType<T> = T extends Promise<infer U> ? U : never;
type ScanAsyncReturnType = PromiseReturnType<ReturnType<typeof scanAsync>>;

type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T;

type DirsType = {
  __dir__?: string;
  __dirs__?: { [index: string]: DirsType };
  __files__?: { [index: string]: Unpacked<ScanAsyncReturnType> };
};

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

type CachedFiles = { [index: string]: string[] };

const cachedFiles: CachedFiles = {};

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

async function scanAsync(srcPath: string) {
  await scanTypescriptAsync(srcPath);
  const result = Object.entries(cachedFiles).map(([src, imports]) => ({
    filename: removeRootDir(srcDir, src),
    imports: imports.map((src) => removeRootDir(srcDir, src)),
  }));
  return result;
}

function reduceDirectoryGroup(result: ScanAsyncReturnType) {
  return result.reduce<DirsType>((sum, src) => {
    const basename = path.basename(src.filename);
    const dirs = path.dirname(src.filename).split('/');
    let s = sum;
    dirs.forEach((dir, i) => {
      if (!s.__dirs__) s.__dirs__ = {};
      if (!s.__dirs__[dir])
        s.__dirs__[dir] = {
          __dir__: dirs.slice(0, i + 1).join('_'),
        };
      s = s.__dirs__[dir];
    });
    if (!s.__files__) s.__files__ = {};
    s.__files__[basename] = src;
    return sum;
  }, {});
}

function printFilesDependencyPlantUML(
  directoryGroups: ReturnType<typeof reduceDirectoryGroup>
) {
  const header = `@startuml dependencies
' title  React サンプルプロジェクト 依存関係図
skinparam shadowing false
scale 0.8
skinparam packageStyle Rectangle
left to right direction
`;

  const footer = `@enduml
`;

  console.log(header);

  const spaces = (level: number) => {
    return new Array(level).fill('  ').join('');
  };

  const printGroup = (groups: DirsType, level: number) => {
    if (groups.__dirs__) {
      Object.entries(groups.__dirs__).forEach(([dirname, dirs]) => {
        console.log(
          `${spaces(level)}package "${dirname}" as ${
            dirs.__dir__ === '.' ? 'root' : dirs.__dir__?.replace(/\//g, '_')
          } {`
        );
        printGroup(dirs, level + 1);
        console.log(`${spaces(level)}}`);
      });
    }
    if (groups.__files__) {
      Object.entries(groups.__files__).forEach(([filename, src]) => {
        console.log(
          `${spaces(level)}rectangle "${path.basename(
            filename
          )}" as ${src.filename.replace(/\//g, '_')}`
        );
      });
    }
  };

  printGroup(directoryGroups, 0);

  const printDependency = (groups: DirsType) => {
    if (groups.__dirs__) {
      Object.entries(groups.__dirs__).forEach(([_, dirs]) => {
        printDependency(dirs);
      });
    }
    if (groups.__files__) {
      Object.entries(groups.__files__).forEach(([_, src]) => {
        src.imports.forEach((file) =>
          console.log(
            `${src.filename.replace(/\//g, '_')} ---> ${file.replace(
              /\//g,
              '_'
            )}`
          )
        );
      });
    }
  };

  printDependency(directoryGroups);

  console.log(footer);
}

async function main(processArgv: string[]) {
  const argv = yargs(hideBin(processArgv))
    .options({ _: { type: 'string' } })
    .demandCommand(1, 'You need at least one typescript source path')
    .help()
    .parseSync();

  const srcPath = argv._[0];
  const cachedFiles = await scanAsync(srcPath);
  const directoryGroups = reduceDirectoryGroup(cachedFiles);

  printFilesDependencyPlantUML(directoryGroups);
}

if (require.main === module) {
  main(process.argv);
}
