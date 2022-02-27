import * as ts from 'typescript';

// TypeScript has a singleton scanner
const scanner = ts.createScanner(ts.ScriptTarget.Latest, /*skipTrivia*/ true);

// That is initialized using a function `initializeState` similar to
function initializeState(text: string) {
  scanner.setText(text);
  scanner.setOnError((message: ts.DiagnosticMessage, length: number) => {
    console.error(message);
  });
  scanner.setScriptTarget(ts.ScriptTarget.ES5);
  scanner.setLanguageVariant(ts.LanguageVariant.Standard);
}

initializeState(
  `function hello(name: string): string {
  return "Hello" + name;
}
console.log(hello("Taro"));
`.trim()
);

// Start the scanning
do {
  const token = scanner.scan();
  console.log(`## ${ts.Debug.formatSyntaxKind(token)}`);
  let tokenStart = scanner.getStartPos();
  console.log(`  ${tokenStart}`);
  console.log(`  ${scanner.getTokenText()}`);
} while (scanner.getTokenPos() < scanner.getTextPos());
