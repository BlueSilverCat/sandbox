const vscode = require("vscode");
const vscodeUtil = require("./vscodeUtil.js");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const channel = vscode.window.createOutputChannel("sandbox");

  vscodeUtil.registerCommand(context, "sandbox.enclose", enclose);
  vscodeUtil.registerCommand(context, "sandbox.insertDate", insertDate);
  vscodeUtil.registerCommand(context, "sandbox.insertRandomNumber", insertRandomNumber);
  vscodeUtil.registerCommand(context, "sandbox.toCamelCase", toCamelCase);
  vscodeUtil.registerCommand(context, "sandbox.toPascalCase", toPascalCase);
  vscodeUtil.registerCommand(context, "sandbox.toSnakeCase", toSnakeCase);
  vscodeUtil.registerCommand(context, "sandbox.toChainCase", toChainCase);
  vscodeUtil.registerCommand(context, "sandbox.highlight", highlight);
  vscodeUtil.registerCommand(context, "sandbox.getCommands", getCommands);

  async function getCommands() {
    const commands = await vscode.commands.getCommands();
    for (const command of commands) {
      channel.appendLine(command);
    }
    channel.show();
  }

  function enclose() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.enclose(editor);
  }

  function insertDate() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.insertDate(editor);
  }

  function insertRandomNumber() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.insertRandomNumber(editor);
  }

  function toCamelCase() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.changeCase(editor, "camel");
  }

  function toPascalCase() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.changeCase(editor, "pascal");
  }

  function toSnakeCase() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.changeCase(editor, "snake");
  }

  function toChainCase() {
    const editor = vscode.window.activeTextEditor;
    vscodeUtil.changeCase(editor, "chain");
  }

  function highlight() {
    const editor = vscode.window.activeTextEditor;
    const ranges = vscodeUtil.getMatchedRange(editor.document, "cat\ncat");
    vscodeUtil.decorateRanges(editor, ranges);
  }
}
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
