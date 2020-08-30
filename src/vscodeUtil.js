const vscode = require("vscode");
const util = require("./util.js");

function registerCommand(context, command, callback) {
  context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}

function getEol(document) {
  return document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
}

function getSelectionRanges(editor) {
  const ranges = [];
  for (const selection of editor.selections) {
    ranges.push(new vscode.Range(selection.start, selection.end));
  }
  return ranges;
}

function getRangesText(document, ranges) {
  const texts = [];
  for (const range of ranges) {
    texts.push(document.getText(range));
  }
  return texts;
}

async function replaceRanges(document, ranges, texts) {
  const workspaceEdit = new vscode.WorkspaceEdit();
  for (let i = 0; i < ranges.length; ++i) {
    workspaceEdit.replace(document.uri, ranges[i], texts[i]);
  }
  await vscode.workspace.applyEdit(workspaceEdit);
}

function enclose(editor, start = "`", end = "`", separator = ", *") {
  const eol = getEol(editor.document);
  const ranges = getSelectionRanges(editor);
  const texts = getRangesText(editor.document, ranges);
  let enclosedLines = [];

  for (const text of texts) {
    let lines = text.split(eol);
    lines = lines.map((line) => {
      let { separateTexts, separators } = util.separate(line, separator);
      separateTexts = separateTexts.map((e) => {
        return e.length > 0 ? start + e + end : e;
      });
      return util.join(separateTexts, separators, true);
    });
    enclosedLines.push(lines.join(eol));
  }
  replaceRanges(editor.document, ranges, enclosedLines);
}

// 名前がForEachで良いか?
// function replaceSelections(editor, func, ...args) {
//   const ranges = getSelectionRanges(editor);
//   let texts = [];
//   for (const _range of ranges) {
//     texts.push(func(...args));
//   }
//   replaceRanges(editor.document, ranges, texts);
// }

function insertDate(editor) {
  const ranges = getSelectionRanges(editor);
  const texts = [];
  for (const _ of ranges) {
    texts.push(util.getDate());
  }
  replaceRanges(editor.document, ranges, texts);
}

function insertRandomNumber(editor, min = 0, max = 100, digits = 3) {
  const ranges = getSelectionRanges(editor);
  const texts = [];
  for (const _ of ranges) {
    texts.push(util.getRandomIntegerFormatted({ min, max }, { digits }));
  }
  replaceRanges(editor.document, ranges, texts);
}

function changeCase(editor, caseType) {
  const eol = getEol(editor.document);
  const ranges = getSelectionRanges(editor);
  let texts = getRangesText(editor.document, ranges);
  const result = [];
  for (const text of texts) {
    let lines = text.split(eol);
    let func = null;
    let param = [];
    switch (caseType) {
      case "camel":
        func = util.toCamelCase;
        param = [false];
        break;
      case "pascal":
        func = util.toCamelCase;
        param = [true];
        break;
      case "snake":
        func = util.toSnakeCase;
        param = ["_", true];
        break;
      case "chain":
        func = util.toSnakeCase;
        param = ["-", true];
        break;
      default:
    }
    lines = lines.map((v) => {
      return func(v, ...param);
    });
    result.push(lines.join(eol));
  }
  replaceRanges(editor.document, ranges, result);
}

function getMatchedRange(document, string) {
  const re = new RegExp(string, "mgu");
  const text = document.getText();
  const ranges = [];
  let match = null;
  match = re.exec(text);
  while (match !== null) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(re.lastIndex);
    ranges.push(new vscode.Range(start, end));
    match = re.exec(text);
  }
  return ranges;
}

function decorateRanges(editor, ranges) {
  const decorationType = vscode.window.createTextEditorDecorationType({ backgroundColor: "red" });
  editor.setDecorations(decorationType, ranges);
  return decorationType;
}

exports.registerCommand = registerCommand;
//exports.getSelectionRanges = getSelectionRanges;
exports.enclose = enclose;
exports.insertDate = insertDate;
exports.insertRandomNumber = insertRandomNumber;
exports.changeCase = changeCase;

exports.decorateRanges = decorateRanges;
exports.getMatchedRange = getMatchedRange;
