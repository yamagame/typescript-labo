#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type PromiseReturnType<T> = T extends Promise<infer U> ? U : never;
type ScanAsyncReturnType = PromiseReturnType<ReturnType<typeof scanAsync>>;
type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

type DirsType = {
  __dir__?: string;
  __dirs__?: { [index: string]: DirsType };
  __files__?: { [index: string]: Flatten<ScanAsyncReturnType> };
};

const header = [
  '@startuml dependencies',
  "' title  React サンプルプロジェクト 依存関係図",
  'skinparam shadowing false',
  'scale 0.8',
  'skinparam packageStyle Rectangle',
  // 'left to right direction',
];

const footer = ['@enduml'];

const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

const spaces = (level: number) => {
  return new Array(level).fill('  ').join('');
};

const exts = ['', '.ts', '.js', '.jsx', '.tsx'];

const removeRootDir = (srcDir: string, src: string) => {
  if (srcDir !== '' && src.indexOf(srcDir) === 0) {
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

const findFile = (basePath: string, baseDir: string, filename: string) => {
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
    if (fs.existsSync(filename) && !fs.lstatSync(filename).isDirectory())
      return filename;
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
        path.join(baseDir, `${filename}${ext}`).normalize()
      );
      if (file) return file;
    }
    {
      const file = findFileWithExts((ext) =>
        path.join(baseDir, `${filename}/index${ext}`).normalize()
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

const scanTypescriptAsync = async (srcPath: string, baseDir: string) => {
  try {
    if (cachedFiles[srcPath]) {
      return;
    }
    // console.log(`${srcPath} -------------------------------------------`);
    const fileInfo = ts.preProcessFile(fs.readFileSync(srcPath).toString());
    const imports = fileInfo.importedFiles
      .map((file) => file.fileName)
      .map((file) => findFile(path.dirname(srcPath), baseDir, file))
      .filter(isDefined);
    // console.log(imports);
    cachedFiles[srcPath] = imports;
    imports.forEach((importFile) => {
      scanTypescriptAsync(importFile, baseDir);
    });
  } catch (err) {
    console.error(srcPath);
    console.error(err);
  }
};

async function scanAsync(srcPath: string, baseDir: string) {
  await scanTypescriptAsync(srcPath, baseDir);
  const result = Object.entries(cachedFiles).map(([src, imports]) => ({
    filename: removeRootDir(baseDir, src),
    imports: imports.map((src) => removeRootDir(baseDir, src)),
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

const rootIsRoot = (path: string | undefined) => {
  if (path === undefined) return 'undefined';
  return path === '.' ? 'root' : path;
};

function printFilesDependencyPlantUML(
  directoryGroups: ReturnType<typeof reduceDirectoryGroup>
) {
  console.log(header.join('\n'));

  const printGroup = (groups: DirsType, level: number) => {
    if (groups.__dirs__) {
      Object.entries(groups.__dirs__).forEach(([dirname, dirs]) => {
        console.log(
          `${spaces(level)}package "${dirname}" as ${rootIsRoot(
            dirs.__dir__
          ).replace(/\//g, '_')} {`
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

  console.log(footer.join('\n'));
}

function printDirectoryDependencyPlantUML(
  directoryGroups: ReturnType<typeof reduceDirectoryGroup>
) {
  console.log(header.join('\n'));

  const dependencies: { [index: string]: string[] } = {};

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
      Object.entries(groups.__files__).forEach(([_, src]) => {
        const dir = path.dirname(src.filename).replace(/\//g, '_');
        src.imports.forEach((filename) => {
          const importDir = path.dirname(filename).replace(/\//g, '_');
          if (dir === importDir) return;
          if (!dependencies[dir]) dependencies[dir] = [];
          dependencies[dir].push(importDir);
        });
      });
    }
  };

  printGroup(directoryGroups, 0);

  const printDependency = (dependencies: { [index: string]: string[] }) => {
    Object.entries(dependencies).forEach(([dir, imports]) => {
      imports.forEach((importDir) => {
        console.log(`${rootIsRoot(dir)} ---> ${rootIsRoot(importDir)}`);
      });
    });
  };

  printDependency(dependencies);

  console.log(footer.join('\n'));
}

async function main(processArgv: string[]) {
  const argv = yargs(hideBin(processArgv))
    .options({
      _: { type: 'string' },
      baseDir: { type: 'string', default: '' },
      mode: {
        choices: ['file', 'directory', 'dir'],
        default: 'file',
        describe: 'output mode',
      },
    })
    .demandCommand(1, 'You need at least one typescript source path')
    .help()
    .parseSync();

  const baseDir = argv.baseDir;
  const srcPath = argv._[0];
  const cachedFiles = await scanAsync(srcPath, baseDir);
  console.error(JSON.stringify(cachedFiles, null, '  '));
  const directoryGroups = reduceDirectoryGroup(cachedFiles);

  if (argv.mode === 'directory' || argv.mode === 'dir') {
    printDirectoryDependencyPlantUML(directoryGroups);
  } else {
    printFilesDependencyPlantUML(directoryGroups);
  }
}

if (require.main === module) {
  main(process.argv);
}
