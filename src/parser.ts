import fs from 'fs';
import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type LineInfo = {
  element: boolean;
  level: number;
  kind: string;
  line: number;
  endl: number;
  pos: number;
  end: number;
  text: string;
  node?: ts.Node;
  hasNodes: boolean;
};

const indent = (level: number) => new Array(level).fill('  ').join('');

function scanAllChildren(
  result: LineInfo[],
  node: ts.Node,
  pos: number,
  depth = 0
) {
  const startLine = ts.getLineAndCharacterOfPosition(
    node.getSourceFile(),
    node.pos
  );
  if (node.pos !== pos && node.getLeadingTriviaWidth() > 0) {
    const trivias = ts.getLeadingCommentRanges(node.getFullText(), 0);
    trivias?.forEach((trivia) => {
      const text = node.getFullText().substring(trivia.pos, trivia.end);
      const commentStartLine = ts.getLineAndCharacterOfPosition(
        node.getSourceFile(),
        node.pos + trivia.pos
      );
      const commentEndLine = ts.getLineAndCharacterOfPosition(
        node.getSourceFile(),
        node.pos + trivia.pos + text.length
      );
      result.push({
        element: true,
        level: depth,
        kind: ts.Debug.formatSyntaxKind(trivia.kind),
        line: commentStartLine.line,
        endl: commentEndLine.line,
        pos: trivia.pos + node.pos,
        end: trivia.end + node.pos,
        text,
        hasNodes: false,
        // node,
      });
    });
  }
  const text = node.getText();
  const nextStartLine = ts.getLineAndCharacterOfPosition(
    node.getSourceFile(),
    node.pos + node.getLeadingTriviaWidth()
  );
  const nextEndLine = ts.getLineAndCharacterOfPosition(
    node.getSourceFile(),
    node.pos + node.getLeadingTriviaWidth() + text.length
  );
  const kind = ts.Debug.formatSyntaxKind(node.kind);
  const childrend = node.getChildren();
  result.push({
    element: childrend.length == 0,
    level: depth,
    kind,
    line: nextStartLine.line,
    endl: nextEndLine.line,
    pos: node.pos + node.getLeadingTriviaWidth(),
    end: node.end,
    text,
    hasNodes: childrend.length > 0,
    // node,
  });
  if (kind === 'JSDocComment') return;
  depth++;
  childrend.forEach((c) => scanAllChildren(result, c, node.pos, depth));
}

function scanJsxFunctions(result: LineInfo[]) {
  const nextFunction = (i: number) => {
    const node = result[i];
    for (let j = i + 1; j < result.length; j++) {
      const tnode = result[j];
      if (tnode.level <= node.level) {
        return j;
      }
    }
    return result.length;
  };
  const prevFind = (i: number, kind: string) => {
    const node = result[i];
    for (let j = i - 1; j >= 0; j--) {
      const tnode = result[j];
      if (tnode.level < node.level) throw new Error('error 2');
      if (tnode.kind.indexOf(kind) === 0) return j;
    }
    return 0;
  };
  const nextFind = (i: number, kind: string | string[]) => {
    const findCore = (i: number, kind: string) => {
      const node = result[i];
      for (let j = i + 1; j < result.length; j++) {
        const tnode = result[j];
        if (tnode.level < node.level) return -1;
        if (result[j].kind.indexOf(kind) === 0) return j;
      }
      return -1;
    };
    if (Array.isArray(kind)) {
      for (let j = 0; j < kind.length; j++) {
        i = findCore(i, kind[j]);
        if (i < 0) return -1;
      }
      return i;
    }
    return findCore(i, kind);
  };
  for (let i = 0; i < result.length; i++) {
    const node = result[i];
    if (node.kind === 'FunctionDeclaration') {
      const f = nextFind(i, 'FunctionKeyword');
      const e = nextFind(i, 'ExportKeyword');
      const t = nextFind(i, 'Identifier');
      if (nextFind(t, 'JsxElement') >= 0) {
        console.log(`${e >= 0 ? 'export ' : ''}${result[t].text}`);
      }
      i = nextFunction(i);
    }
    if (node.kind === 'VariableStatement') {
      const a = nextFind(i, 'ArrowFunction');
      if (a >= 0) {
        const e = nextFind(i, ['SyntaxList', 'ExportKeyword']);
        const t = prevFind(a, 'Identifier');
        if (t >= 0) {
          if (
            nextFind(t, 'JsxElement') >= 0 ||
            nextFind(t, 'JsxSelfClosingElement') >= 0
          ) {
            console.log(`${e >= 0 ? 'export ' : ''}${result[t].text}`);
          }
        }
        i = nextFunction(a);
      }
    }
  }
}

async function main(arg: string[]) {
  const argv = yargs(hideBin(arg))
    .options({
      _: { type: 'string' },
      mode: {
        choices: ['src', 'tree', 'json', 'jsx-element'],
        default: 'src',
        describe: 'output mode',
      },
    })
    .demandCommand(1, 'You need at least one typescript source path')
    .help()
    .parseSync();

  const sourcePath = argv._[0];
  var sourceCode = fs.readFileSync(sourcePath, 'utf-8').trim();

  var sourceFile = ts.createSourceFile(
    sourcePath,
    sourceCode,
    ts.ScriptTarget.ES5,
    true
  );

  const result: LineInfo[] = [];
  scanAllChildren(result, sourceFile, -1);

  // ソース再生成
  if (argv.mode === 'src') {
    let line = 0;
    let pos = 0;
    let kind: ReturnType<typeof ts.Debug.formatSyntaxKind> = 'SourceFile';
    result.forEach((node) => {
      if (node.element) {
        if (node.line !== line) {
          for (let i = 0; i < node.line - line; i++) {
            console.log('');
          }
          pos = node.pos;
        }
        if (pos !== node.pos) {
          for (let i = 0; i < node.pos - pos; i++) {
            process.stdout.write(' ');
          }
        }
        process.stdout.write(node.text);
        line = node.endl;
        pos = node.end;
        kind = node.kind;
      }
    });
  }

  // JSON形式
  if (argv.mode === 'json') {
    console.log(JSON.stringify(result, null, '  '));
  }

  // TREE形式
  if (argv.mode === 'tree') {
    result.forEach((node) => {
      if (node.kind.match(/Trivia$/)) {
        console.log(
          `${indent(node.level)}${node.kind} ${
            node.hasNodes ? '' : node.text.replace(/\n/g, '\\n')
          }`
        );
      } else if (node.kind.match(/JsxElement/)) {
        console.log(`${indent(node.level)}${node.kind} ${node.text}`);
      } else {
        console.log(
          `${indent(node.level)}${node.kind} ${node.hasNodes ? '' : node.text}`
        );
      }
    });
  }

  // JSXエレメント
  if (argv.mode === 'jsx-element') {
    scanJsxFunctions(result);
  }
}

if (require.main === module) {
  main(process.argv);
}
