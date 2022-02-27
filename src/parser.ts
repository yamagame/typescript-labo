import path from 'path';
import fs from 'fs';
import * as ts from 'typescript';

function printAllChildren(node: ts.Node, pos: number, depth = 0) {
  const indent = new Array(depth + 1).join('--');
  if (node.pos !== pos && node.getLeadingTriviaWidth() > 0) {
    const trivias = ts.getLeadingCommentRanges(node.getFullText(), 0);
    trivias?.forEach((trivia) => {
      console.log(
        indent,
        '#',
        ts.Debug.formatSyntaxKind(trivia.kind),
        trivia.pos,
        trivia.end,
        node.getFullText().substring(trivia.pos, trivia.end)
      );
    });
  }
  const { line, character } = ts.getLineAndCharacterOfPosition(
    node.getSourceFile(),
    node.pos + node.getLeadingTriviaWidth()
  );
  console.log(
    indent,
    ts.Debug.formatSyntaxKind(node.kind),
    line,
    node.pos,
    node.end,
    node.getLeadingTriviaWidth(),
    [ts.SyntaxKind.Identifier, ts.SyntaxKind.StringLiteral].indexOf(
      node.kind
    ) >= 0
      ? node.getText()
      : ''
  );
  depth++;
  node.getChildren().forEach((c) => printAllChildren(c, node.pos, depth));
}

const sourcePath = path.join(__dirname, '../src/hello.tsx');
var sourceCode = fs.readFileSync(sourcePath, 'utf-8').trim();

var sourceFile = ts.createSourceFile(
  sourcePath,
  sourceCode,
  ts.ScriptTarget.ES5,
  true
);
printAllChildren(sourceFile, -1);
