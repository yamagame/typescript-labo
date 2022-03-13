import fs from 'fs';
import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type LineInfo = {
  element: boolean;
  level?: number;
  kind: string;
  line: number;
  endl: number;
  pos: number;
  end: number;
  text: string;
  node?: ts.Node;
};
type ResultObject = LineInfo[];

function scanAllChildren(
  result: ResultObject,
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
        level: depth + 1,
        kind: ts.Debug.formatSyntaxKind(trivia.kind),
        line: commentStartLine.line,
        endl: commentEndLine.line,
        pos: trivia.pos + node.pos,
        end: trivia.end + node.pos,
        text,
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
    level: depth + 1,
    kind,
    line: nextStartLine.line,
    endl: nextEndLine.line,
    pos: node.pos + node.getLeadingTriviaWidth(),
    end: node.end,
    text,
    // node,
  });
  if (kind === 'JSDocComment') return;
  depth++;
  childrend.forEach((c) => scanAllChildren(result, c, node.pos, depth));
}

async function main(arg: string[]) {
  const argv = yargs(hideBin(arg))
    .options({
      _: { type: 'string' },
      mode: {
        choices: ['src', 'json'],
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

  const result: ResultObject = [];
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
}

if (require.main === module) {
  main(process.argv);
}
