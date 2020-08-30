"use babel";

// 選択したものを左右に移動させるコマンドを作る

function getLastActiveTextEditor() {
  let result = atom.workspace.getActiveTextEditor();
  if (result === null) {
    const editors = atom.workspace.getTextEditors();
    let last = 0;
    for (const editor of editors) {
      if (last < editor.lastOpened) {
        result = editor;
        last = editor.lastOpened;
      }
    }
  }
  return result;
}

function getOpenPromise(uri = "", {
  initialLine = 0,
  initialcolumn = 0,
  split = "right",
  activatePane = true,
  activateItem = true,
  pending = false,
  searchAllPanes = false,
} = {}) {
  return atom.workspace.open(uri, {
    initialLine,
    initialcolumn,
    split,
    activatePane,
    activateItem,
    pending,
    searchAllPanes,
  });
}

function sumCSV() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  const re = /[^\d.]/;
  editor.transact(() => {
    selectionsForEach(editor, (selection) => {
      const lineTexts = selection.getText().split("\n");
      const sums = lineTexts.map((v1) => {
        return v1.split(",").reduce((acc, v2) => {
          const str = v2.trim();
          let num = 0;
          if (str !== "" && re.test(str) !== true) {
            num = parseFloat(str, 10);
          }
          return acc + num;
        }, 0);
      });
      const text = lineTexts.map((v, i) => {
        if (v === "") {
          return "";
        }
        return `${v}, ${sums[i].toFixed(2)}`;
      }).join("\n");
      selection.insertText(text);
    });
  });
}

function splitLines() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  editor.transact(() => {
    selectionsForEach(editor, (selection) => {
      let lines = selection.getText().split(",");
      lines = lines.map((v) => {
        return v.trim();
      });
      lines = lines.join("\n");
      selection.insertText(lines);
    });
  });
}

function toInt(data) {
  const re = /U+|0x/;
  return data.map((v) => {
    if (re.test(v)) {
      return parseInt(v.replace(re, ""), 16);
    }
    return parseInt(v, 10);
  });
}

function fromCodePoint() {
  const reSpace = / /g;
  let data = initScriptView.searchInput.value;
  data = data.replace(reSpace, "");
  data = data.split(",");
  data = toInt(data);
  const result = String.fromCodePoint(...data);
  initScriptView.replaceInput.value = result;
}

function toCodePoint() {
  const re = /./ug;
  let data = initScriptView.searchInput.value;
  data = data.match(re);
  data = data.map((v) => {
    return `U+${v.codePointAt(0).toString(16)}`;
  });
  data = data.join(", ");
  initScriptView.replaceInput.value = data;
}

function bS(num) {
  let result = 360 - num;
  if (result >= 360) {
    result -= 360;
  }
  return result;
}

function bilateralSymmetry(editor) {
  const re = /( {2}?\d| ?\d{2}|\d{3}),(?: *)(\d{1,3}),(?: *)(\d{1,3})/g;
  for (const selection of editor.getSelections()) {
    const selectionRange = selection.getBufferRange();
    editor.scanInBufferRange(re, selectionRange, ({ range }) => {
      const text = editor.getTextInBufferRange(range);
      // console.log(text, range, re.lastIndex);
      const result = re.exec(text);
      re.lastIndex = 0;
      let [, x, y, z] = result;
      x = x.toString(10);
      y = bS(y).toString(10);
      z = bS(z).toString(10);
      x = padChars(x, 3 - x.length, { "pos": "begin" });
      y = padChars(y, 3 - y.length, { "pos": "begin" });
      z = padChars(z, 3 - z.length, { "pos": "begin" });
      editor.setTextInBufferRange(range, `${x}, ${y}, ${z}`);
    });
  }
}

function callBilateralSymmetry() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  editor.transact(() => {
    bilateralSymmetry(editor);
  });
}

function beautifyIncrement() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  // ^[^ \n\d]+ *\d{1,3},

  let alignment = "right"; // "left" or "right";
  let prefix = initScriptView.searchInput.value;
  let suffix = initScriptView.searchInput.value;
  prefix = "[^ \\n\\d]+";
  suffix = "\\d{1,3},";
  const targetString = " *";
  let target = `${prefix}${targetString}${suffix}`;
  try {
    prefix = new RegExp(prefix);
  } catch (_e) {
    //
  }
  try {
    suffix = new RegExp(suffix);
  } catch (_e) {
    //
  }
  try {
    target = new RegExp(target, "g");
  } catch (_e) {
    //
  }
  // console.log(prefix, suffix, target);

  let { "start": selectionStart, "end": selectionEnd } = editor.getSelectedBufferRange();
  // console.log(selectionStart, selectionEnd);
  if (selectionStart === selectionEnd) {
    editor.selectAll();
    ({ "start": selectionStart, "end": selectionEnd } = editor.getSelectedBufferRange());
  }
  const fontSize = atom.config.get("editor.fontSize");
  const unit = fontSize / 2;

  const rangeArray = [];

  let max = 0;
  let prefixRight = {};
  let prefixLeft = {};
  let suffixRight = {};
  let suffixLeft = {};
  let right = {};
  let left = {};
  let length = 0;
  let replaceLength = 0;
  editor.scanInBufferRange(target, { "start": selectionStart, "end": selectionEnd }, ({ "range": targetRange }) => {
    editor.scanInBufferRange(prefix, targetRange, ({ "range": prefixRange, matchText }) => {
      ({ "start": prefixLeft, "end": prefixRight } = prefixRange);
      // console.log(matchText);
    });
    editor.scanInBufferRange(suffix, targetRange, ({ "range": suffixRange, matchText }) => {
      ({ "start": suffixLeft, "end": suffixRight } = suffixRange);
      // console.log(matchText);
    });
    if (alignment === "left") {
      ({ left } = editor.element.pixelPositionForBufferPosition(prefixLeft));
      ({ "left": right } = editor.element.pixelPositionForBufferPosition(suffixLeft));
    } else {
      ({ left } = editor.element.pixelPositionForBufferPosition(prefixLeft));
      ({ "left": right } = editor.element.pixelPositionForBufferPosition(suffixRight));
    }
    length = Math.round((right - left) / unit);
    if (length > max) {
      max = length;
    }

    ({ left } = editor.element.pixelPositionForBufferPosition(prefixRight));
    ({ "left": right } = editor.element.pixelPositionForBufferPosition(suffixLeft));
    replaceLength = Math.round((right - left) / unit);

    // console.log(targetRange, prefixRight, suffixRight, length);
    rangeArray.push({ "range": targetRange, "replaceRange": { "start": prefixRight, "end": suffixLeft }, replaceLength, length });
  });
  // console.log(alignment, max, rangeArray);
  let replaceRange = {};
  let paddingString = "";
  editor.transact(() => {
    for ({ replaceRange, replaceLength, length } of rangeArray.reverse()) {
      if (alignment === "left") {
        paddingString = " ".repeat(max - length);
      } else {
        paddingString = " ".repeat(replaceLength + max - length);
      }
      editor.setTextInBufferRange(replaceRange, paddingString);
    }
  });
  /*
  for (let i = start.row; i < end.row; ++i) {
    editor.setCursorBufferPosition([i, 0]);
    editor.moveToEndOfLine();
    bufferPosition = editor.getCursorBufferPosition();
    ({ left } = editor.element.pixelPositionForBufferPosition(bufferPosition));
    num = (max - left) / unit;
    if (padding === true) {
      text = `${paddingString.repeat(num)}${joiner}${returnValueIfUndefined(strings[i - start.row])}`;
    } else {
      text = `${joiner}${returnValueIfUndefined(strings[i - start.row])}`;
    }
    editor.setTextInBufferRange([
      [i, bufferPosition.column],
      [i, bufferPosition.column],
    ], text);
  }
  //*/
  editor.setSelectedBufferRange({ "start": selectionStart, "end": selectionEnd });
}

function getMaxLeft() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return 0;
  }
  const { start, end } = editor.getSelectedBufferRange();
  let bufferPosition = {};
  let left = 0;
  let max = 0;
  for (let i = start.row; i < end.row; ++i) {
    editor.setCursorBufferPosition([i, 0]);
    editor.moveToEndOfLine();
    bufferPosition = editor.getCursorBufferPosition();
    ({ left } = editor.element.pixelPositionForBufferPosition(bufferPosition));
    if (left > max) {
      max = left;
    }
  }
  editor.setSelectedBufferRange({ start, end });
  return max;
}

function appendStringEachLines({ strings = "", joiner = " | ", padding = true, max = 0, paddingString = " " }) {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  const { start, end } = editor.getSelectedBufferRange();
  const fontSize = atom.config.get("editor.fontSize");
  const unit = fontSize / 2;
  let bufferPosition = {};
  let left = 0;
  let num = 0;
  let text = "";
  for (let i = start.row; i < end.row; ++i) {
    editor.setCursorBufferPosition([i, 0]);
    editor.moveToEndOfLine();
    bufferPosition = editor.getCursorBufferPosition();
    ({ left } = editor.element.pixelPositionForBufferPosition(bufferPosition));
    num = (max - left) / unit;
    if (padding === true) {
      text = `${paddingString.repeat(num)}${joiner}${returnValueIfUndefined(strings[i - start.row])}`;
    } else {
      text = `${joiner}${returnValueIfUndefined(strings[i - start.row])}`;
    }
    editor.setTextInBufferRange([
      [i, bufferPosition.column],
      [i, bufferPosition.column],
    ], text);
  }
  editor.setSelectedBufferRange({ start, end });
}

function jointLines() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  const lineClipboradTexts = atom.clipboard.read().split("\n");
  const max = getMaxLeft();
  editor.transact(() => {
    appendStringEachLines({ "strings": lineClipboradTexts, max });
  });
}

function getMaxLen(arr) {
  let max = 0;
  arr.forEach((e) => {
    max = max < e.length ? e.length : max;
  });
  return max;
}

function padChars(string, length, { chars = " ", pos = "end" } = {}) {
  if (length < 0) {
    return string;
  }

  let result = "";
  if (pos !== "end") {
    result += `${chars.repeat(length)}`;
  }
  result += `${string}`;
  if (pos !== "begin") {
    result += `${chars.repeat(length)}`;
  }
  return result;
}

function returnValueIfUndefined(target, value = "") {
  if (typeof target === "undefined") {
    return value;
  }
  return target;
}

function longerFirst(a1, a2) {
  let [r1, r2] = [a1, a2];
  if (a2.length > a1.length) {
    [r1, r2] = [a2, a1];
  }
  return [r1, r2];
}

function selectLines() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  const start = initScriptView.searchInput.value !== "" ? parseInt(initScriptView.searchInput.value, 10) - 1 : 0;
  const end = initScriptView.searchInput.value !== "" ? parseInt(initScriptView.searchInput.value, 10) : editor.getLastBufferRow();

  const range = [
    [start, 0],
    [end, 0],
  ];
  editor.setSelectedBufferRange(range);
}

function tempWork() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  let text = editor.getSelectedText();
  if (text === "") {
    editor.selectAll();
    text = editor.getSelectedText();
  }

  text = text.replace(/\n/g, " ");
  let array = [];
  reExecForEach(/U\+([0-9A-F]+)/g, text, (string, execResult) => {
    array.push(parseInt(execResult[1], 16));
    return string;
  });
  console.log(array);

  let result = [`\\\\u${array[0].toString(16)}`];
  let flag = true;
  for (let i = 1; i < array.length; ++i) {
    if (array[i] - array[i - 1] === 1) {
      if (flag === false) {
        result.pop();
      }
      flag = false;
      result.push(`-\\\\u${array[i].toString(16)}`);
    } else {
      flag = true;
      result.push(`\\\\u${array[i].toString(16)}`);
    }
  }
  result = result.join("");
  editor.insertText(result);
}

function test() {
  const editors = atom.workspace.getTextEditors();
  let last = 0
  let title = "";
  for (const editor of editors) {
    console.log(editor);
    console.log(editor.getTitle());
    console.log(editor.lastOpened);
    if (last < editor.lastOpened) {
      title = editor.getTitle();
      last = editor.lastOpened;
    }
  }
  console.log(`${title}, ${last}`)
  const panes = atom.workspace.getPaneItems();
  for (const pane of panes) {
    console.log(pane);
    // console.log(pane.getItems());
  }
  // const editor = atom.workspace.getActiveTextEditor();
  // if (editor === null) {
  //   return;
  // }
  // editor.insertText("_*_");
  // console.log(atom.config);
  // const bufferPosition = editor.getCursorBufferPosition();
  // const pixelForBufferPosition = editor.element.pixelPositionForBufferPosition(bufferPosition);
  // console.log(atom.config.get("editor.fontSize"));
  // console.log(bufferPosition, pixelForBufferPosition);
  // const screnPosition = editor.getCursorScreenPosition();
  // const pixelForScreenPosition = editor.element.pixelPositionForScreenPosition(screnPosition);
  // console.log(bufferPosition, screnPosition, pixelForBufferPosition, pixelForScreenPosition);
  // const max = getMaxLeft();
  // appendString(max, "_");
  // let text = editor.getSelectedText();
  // console.log(text);
  // console.log(atom.commands);
  // console.log(atom.commands.registeredCommands);
  // console.log(atom.keymaps);
  // console.log(atom.keymaps.keyBindings);
  // console.log(atom.keymaps.getKeyBindings());
  // console.log(atom.keymaps.keyBindings.getKeyBindings());
  // let result = atom.packages.getActivePackages();
  // console.log(result);
  // for (let i = 0; i < result.length; ++i) {
  //   console.log(i, result[i].name);
  // }
  // result = atom.project.getPaths();
  // console.log(result);
  // const dirs = atom.project.getDirectories();
  // console.log(dirs);
  // result = atom.packages.getLoadedPackages();
  // console.log(result);
  // for (let i = 0; i < result.length; ++i) {
  //   console.log(i, result[i].name);
  // }
  // getSearchPatternFromFaR();
  // console.log(initScriptView.searchInput.value);
  // console.log(initScriptView.searchInput.value);
  // console.log(atom.grammars);
  // console.log(atom.workspace);
}

function trimRegex(str, source) {
  let re = new RegExp(`^${source}+`, "g");
  let result = str.replace(re, "");
  re = new RegExp(`${source}+$`, "g");
  result = result.replace(re, "");
  if (result === "") {
    return str;
  }
  return result;
}

function reExecForEach(re, str, func) {
  let execResult = re.exec(str);
  let result = str;
  while (execResult !== null) {
    result = func(result, execResult);
    execResult = re.exec(result);
  }
  return result;
}

function matchForEach(re, str, func, join = false) {
  let matchResult = str.match(re);
  if (matchResult === null) {
    if (join === true) {
      return str;
    }
    return [str];
  }

  for (let i = 0; i < matchResult.length; ++i) {
    matchResult[i] = func(matchResult[i]);
  }
  if (join === true) {
    matchResult = matchResult.join("");
  }
  return matchResult;
}

// 名前がForEachで良いか?
function selectionsForEach(editor, func, ...args) {
  const selections = editor.getSelections();
  let result = [];
  for (const selection of selections) {
    result.push(func(selection, result, ...args)); // Spreadすべきか否か
  }
  return result;
}

function replace(string = "", { repl = "", start = 0, end = start + repl.length }) {
  return `${string.slice(0, start)}${repl}${string.slice(end)}`;
}

function camelCase(text, upper = false) {
  const trim = "[ _-]";
  const re = /[ _-][a-zA-Z]/g;
  let result = text;
  let repl = "";

  result = trimRegex(result, trim);
  result = reExecForEach(re, result, (str, execResult) => {
    repl = str.charAt(execResult.index + 1).toUpperCase();
    return replace(str, { repl, "start": execResult.index, "end": execResult.index + 2 });
  });

  if (upper === true) {
    repl = result.charAt(0).toUpperCase();
  } else {
    repl = result.charAt(0).toLowerCase();
  }

  return replace(result, { repl, "end": 1 });
}

// str.replace(/([A-Z])/g, "_$1");
// 大文字小文字の違いを保存したいのでこんな感じに
function snakeCase(text, combinator = "_", lower = false) {
  const re = /.[A-Z]/g;
  let result = text;
  const reCom = new RegExp(`${combinator}{2,}`, "g");

  result = reExecForEach(re, result, (str, execResult) => {
    return replace(str, {
      "repl": `${combinator}${str.charAt(execResult.index + 1)}`,
      "start": execResult.index + 1,
      "end": execResult.index + 2,
    });
  });
  if (/_?([A-Za-z]+_?)+/.test(result) === true) { // snakeCaseに相当するものだけが対象
    result = result.replace(/[ _-]/g, combinator);
    result = result.replace(reCom, combinator);
    if (lower === true) {
      result = result.toLowerCase();
    }
  }

  return result;
}

function changeCase(selection, _result, caseType) {
  let text = selection.getText();
  let texts = text.split(/\r?\n/);
  // const caseType = args[0];
  let func = null;
  let param = [];

  switch (caseType) {
    case "camel":
      func = camelCase;
      param = [false];
      break;
    case "pascal":
      func = camelCase;
      param = [true];
      break;
    case "snake":
      func = snakeCase;
      param = ["_", true];
      break;
    case "chain":
      func = snakeCase;
      param = ["-", true];
      break;
    default:
  }
  texts = texts.map((v) => {
    return func(v, ...param);
  });
  text = texts.join("\n");
  selection.insertText(text);
}

function callChangeCase(caseType = "camel") {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  editor.getBuffer().transact(() => {
    selectionsForEach(editor, changeCase, caseType);
  });
}

function toCamelCase() {
  callChangeCase("camel");
}

function toPascalCase() {
  callChangeCase("pascal");
}

function toSnakeCase() {
  callChangeCase("snake");
}

function toChainCase() {
  callChangeCase("chain");
}

function simpleEncryption(decrypte = false) {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  let text = editor.getSelectedText();
  if (text === "") {
    editor.selectAll();
    text = editor.getSelectedText();
  }
  const kDecryption = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "!", "\"", "#", "$", "%", "&", "'", "(", ")", "-", "=", "^", "~", "\\", "|", "@", "`", "[", "{", ";", "+", ":", "*", "]", "}", ",", "<", ".", ">", "/", "?", "_",
  ];

  const kEncryption = ["@", ")", "~", "N", "_", "V", "R", "X", "e", "H",
    "E", "{", "d", "5", ":", "l", "3", "w", "y", "O", "J", "?", "*", "'", "F", "Z", "7", "b", "g", "}", "\"", "C", "1", "K", "i", "[",
    "%", "B", "!", "I", "`", "\\", "t", "S", "k", "4", ".", "$", ">", "n", "Q", "q", "m", "8", "p", "A", "/", "s", "=", "6", "9", "^",
    "&", "-", "f", "T", "Y", "2", "P", "j", "|", "M", "0", "+", "L", "U", ";", "c", "G", "D", "a", "u", "<", "(", "#", "]", "z", "v", "h", "W", "x", ",", "r", "o",
  ];

  let [src, dest] = [kDecryption, kEncryption];
  if (decrypte === true) {
    [dest, src] = [kDecryption, kEncryption];
  }
  let result = "";
  let i = "";

  text = text.match(/[^]/ug);
  for (const c of text) {
    i = src.indexOf(c);
    if (i === -1) {
      result += c;
    } else {
      result += dest[i];
    }
  }
  editor.insertText(result);
}

function encryption() {
  simpleEncryption(false);
}

function decryption() {
  simpleEncryption(true);
}

/*
function tempWork() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  let text = editor.getText();
  text = text.replace(/^[0-9A-Za-z]{4}\n/gm, "");
  text = text.replace(/^(.)\n/gm, "$1 ");
  text = text.replace(/(.{32})/g, "$1\n");

  editor.setText(text);
}
//*/

function pickUpLine() {
  const editor = getLastActiveTextEditor();
  if (editor === null) {
    return;
  }

  const text = editor.getText().split("\n");
  const search = initScriptView.searchInput.value;
  if (search === "") {
    return;
  }

  const re = new RegExp(search, "g");
  let result = [];
  for (let i = 0; i < text.length; ++i) {
    try {
      if (re.test(text[i]) === true) {
        result.push(i);
      }
    } catch (e) {
      console.log(e);
      return;
    }
  }
  if (result.length === 0) {
    return;
  }

  const openPromise = getOpenPromise();
  let row = 0;
  openPromise.then(
    (destinationEditor) => {
      for (let i = 0; i < result.length; ++i) {
        row = destinationEditor.getLastBufferRow();
        destinationEditor.insertNewline();
        destinationEditor.setTextInBufferRange([
          [row, 0],
          [row, 0],
        ], `${text[result[i]]}, (${result[i] + 1})`);
      }
    },
    (error) => {
      console.log(`initScript: open error=${error}`);
    },
  );
}

function pickUp() {
  const editor = getLastActiveTextEditor();
  if (editor === null) {
    return;
  }

  let text = editor.getText();
  let row = 0;
  const search = initScriptView.searchInput.value;
  if (search === "") {
    return;
  }

  const re = new RegExp(search, "g");
  try {
    text = text.match(re);
  } catch (e) {
    console.log(e);
  }
  // text = text.replace(initScriptView.searchInput.value, initScriptView.searchInput.value);

  const openPromise = getOpenPromise();
  openPromise.then(
    (destinationEditor) => {
      for (const word of text) {
        row = destinationEditor.getLastBufferRow();
        destinationEditor.insertNewline();
        destinationEditor.setTextInBufferRange([
          [row, 0],
          [row, 0],
        ], word);
      }
    },
    (error) => {
      console.log(`initScript: open error=${error}`);
    },
  );
}

class InitScriptView {
  constructor() {
    this.element = document.createElement("div");
    this.element.classList.add("initScript", "native-key-bindings", "view");

    this.searchInput = InitScriptView.makeInput({
      "cl": "search",
      "placeholder": "Search",
      "defaultValue": "",
      // "func": this.setSearch(),
    });
    this.replaceInput = InitScriptView.makeInput({
      "cl": "replace",
      "placeholder": "Rearch",
      "defaultValue": "",
      // "func": this.setReplace(),
    });
    this.button = InitScriptView.makeButton({
      "cl": "close",
      "icon": "icon-x",
      "func": this.hidePanel(),
    });

    this.element.appendChild(this.button);
    this.element.appendChild(this.searchInput);
    this.element.appendChild(this.replaceInput);

    this.panel = atom.workspace.addTopPanel({
      // this.panel = atom.workspace.addHeaderPanel({
      // this.panel = atom.workspace.addFooterPanel({
      "item": this.getElement(),
      "visible": false,
      "className": "initScriptPanel",
    });
  }

  destroy() {
    this.element.remove();
    this.searchInput.removeEventListener("input", this.searchInput.func, false);
    this.replaceInput.removeEventListener("input", this.replaceInput.func, false);
    this.button.removeEventListener("click", this.button.func, false);
  }

  getElement() {
    return this.element;
  }

  togglePanel() {
    if (this.panel.isVisible()) {
      this.panel.hide();
    } else {
      this.panel.show();
    }
  }

  hidePanel() {
    return () => {
      this.panel.hide();
    };
  }

  static makeInput({ cl, placeholder, defaultValue = "", func = null }) {
    const input = document.createElement("input");
    input.classList.add("initScript", "input-search", cl);
    input.type = "search";
    input.placeholder = placeholder;
    input.defaultValue = defaultValue;
    // input.addEventListener("input", func, false);
    // input.func = func;
    return input;
  }

  static makeButton({ cl, icon, func }) {
    const button = document.createElement("button");
    button.classList.add("initScript", "btn", "inline-block", "icon", icon, cl);
    button.func = func;
    button.textContent = "close";
    button.addEventListener("click", func, false);
    return button;
  }
}

const initScriptView = new InitScriptView();

function toggleInitPanel() {
  initScriptView.togglePanel();
}

// "abc", abc, abc, 456,def(123, 456,abc,def) 123=123, 123:123
//
function enclose() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  let text = editor.getSelectedText();
  let result = [];
  // const re = new RegExp("([^, ():=\\n]+)(?: *([:=]) *([^, ():=\\n]+))?(?:(,) *)?", "g"); // 空白を整形する場合
  const re = new RegExp("([^, {}():=\\n]+)((?: *([:=]) *[^, {}():=\\n]+)?(?:, *)?)", "g"); // 整形はほかのツールに任せる

  let match = re.exec(text);
  while (match) {
    if (match[3] !== "=") {
      match[1] = match[1].match(/(?:"|')?([^"'\n]+)(?:"|')?/)[1]; // ""を取る
      match[1] = `"${match[1]}"`;
    }
    if (typeof match[2] === "undefined") {
      match[2] = "";
    }
    result.unshift({ "repl": `${match[1]}${match[2]}`, "start": match.index, "end": match.index + match[0].length }); // 文字列の後ろから変換していくためにunshift
    match = re.exec(text);
  }
  for (const i of result) {
    text = replace(text, i);
  }
  editor.insertText(text);
}

function getSearchPatternFromFaR() {
  const farName = "find-and-replace";
  let far = null;

  if (!far) {
    far = atom.packages.getActivePackage(farName);
    if (!far) {
      far = atom.packages.getLoadedPackage(farName);
      if (!far) {
        return;
      }
      far.mainModule.activate();
    }
  }

  initScriptView.searchInput.value = far.mainModule.findOptions.findPattern;
  initScriptView.searchInput.value = far.mainModule.findOptions.replacePattern;
}

//////////
//
//////////

function toPaddedString({ num, radix, digits, upperCase, paddingChar, sign, align }) {
  let str = num.toString(radix);
  if (upperCase) {
    str = str.toUpperCase();
  }
  if (digits === 0) {
    return str;
  }

  if (sign === "plus" && num >= 0) {
    str = `+${str}`;
  } else if (sign === "space" && num >= 0) {
    str = ` ${str}`;
  }

  let len = str.length;
  let result = "";
  while ((digits - len) > 0) {
    result += paddingChar;
    len += 1;
  }

  if (align === "left") {
    result = str + result;
  } else {
    result += str;
  }

  if (align === "right_lead_sign") {
    result = result.replace(/.(.*)([-+ ])(.+)/i, `$2$1${paddingChar}$3`);
  }

  return result;
}

function getRandomInteger(min, max, include = true) {
  const tmin = Math.ceil(min);
  const tmax = Math.floor(max);
  const diff = include ? tmax - tmin + 1 : tmax - tmin;
  return Math.floor(Math.random() * (diff)) + tmin;
}

function getRandomIntegerFormatted({ min, max, include = true }, { digits, radix = 10, upperCase = false, paddingChar = "0", sign = "minus", align = "right" }) {
  const result = getRandomInteger(min, max, include);
  return toPaddedString({ "num": result, radix, digits, upperCase, paddingChar, sign, align });
}

function countSequentialChar(string, index, char, direction = 1) {
  if (index >= string.length) {
    return 0;
  }

  const start = index;
  const end = direction === -1 ? 0 : string.length - 1;

  let count = 0;
  for (let i = start; i * direction <= end * direction; i += direction) {
    if (string[i] !== char) {
      break;
    }
    count += 1;
  }
  return count;
}

function commentOut() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }
  const grammar = atom.workspace.getActiveTextEditor().getGrammar().name;
  let commentStart = "/*\n";
  let commentEnd = "//*/";

  switch (grammar) {
    case "JavaScript":
    case "C":
    case "C++":
    case "Java":
      commentStart = "/*\n";
      commentEnd = "//*/";
      break;
    case "Python":
      commentStart = "\"\"\"comment\n";
      commentEnd = "#\"\"\"";
      break;
    case "GitHub Markdown":
      commentStart = "<!--\n";
      commentEnd = "-->";
      break;
    default:
      commentStart = "/*\n";
      commentEnd = "//*/";
  }

  for (const selection of editor.getSelections()) {
    const text = selection.getText();
    if (text !== "") {
      const { start } = selection.getBufferRange();
      const spaces = countSequentialChar(text, 0, " ");
      const indent = " ".repeat(start.column);
      const commentIndent = " ".repeat(spaces);
      let lineBreak = "\n";
      let commentLineBreak = "";
      if (text[text.length - 1] === "\n") {
        lineBreak = "";
        commentLineBreak = "\n";
      }
      selection.insertText(`${commentIndent}${commentStart}${indent}${text}${lineBreak}${indent}${commentIndent}${commentEnd}${commentLineBreak}`);
    }
  }
}

function replacedCopy() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  // getSearchPatternFromFaR();
  const sear = new RegExp(initScriptView.searchInput.value, "g");
  const repl = initScriptView.searchInput.value;

  editor.copySelectedText();
  let { text, metadata } = atom.clipboard.readWithMetadata();
  text = text.replace(initScriptView.searchInput.value, initScriptView.searchInput.value);
  if (Object.prototype.hasOwnProperty.call(metadata, "selections")) {
    for (const selection of metadata.selections) {
      selection.text = selection.text.replace(sear, repl);
    }
  }
  atom.clipboard.write(text, metadata);
}

function replacedDuplicate() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  // getSearchPatternFromFaR();
  const sear = new RegExp(initScriptView.searchInput.value, "g");
  const repl = initScriptView.searchInput.value;

  const cursors = editor.getCursors();
  for (const cursor of cursors) {
    const range = cursor.getCurrentLineBufferRange();
    const text = editor.lineTextForBufferRow(range.start.row);
    if (text !== "") {
      const replaced = text.replace(sear, repl);
      editor.setTextInBufferRange(range, `${text}\n${replaced}`);
    }
    cursor.setBufferPosition([range.start.row + 1, range.start.column]);
  }
}

function insertRandomNumber() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  const min = 0;
  // const max = 9999;
  // const digits = 4;

  // /////////1234567890123456789;
  const max = 9999999999999999999;
  const digits = 19;

  const selections = editor.getSelections();
  for (const selection of selections) {
    const number = getRandomIntegerFormatted({ min, max }, { digits });
    selection.insertText(number);
  }
}

function getDay(day) {
  const days = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
  return days[day];
}

function getZeroPadString(num, digit = 2) {
  const str = num.toString(10);
  if (digit - str.length > 0) {
    return `${"0".repeat(digit - str.length)}${str}`;
  }
  return str;
}

function getDate() {
  const data = new Date();
  const month = getZeroPadString(data.getMonth() + 1);
  const date = getZeroPadString(data.getDate());
  const day = getDay(data.getDay());
  const hours = getZeroPadString(data.getHours());
  const minutes = getZeroPadString(data.getMinutes());
  const seconds = getZeroPadString(data.getSeconds());
  const milliseconds = getZeroPadString(data.getMilliseconds(), 3);

  return `${data.getFullYear()}/${month}/${date}/${day}_${hours}:${minutes}:${seconds}:${milliseconds}`;
}

function insertTime() {
  const editor = atom.workspace.getActiveTextEditor();
  if (editor === null) {
    return;
  }

  const selection = editor.getLastSelection();
  selection.insertText(getDate());
}

function tt1() {
  console.log(1);
}

function tt2() {
  console.log(2);
}

function tt3() {
  console.log(3);
}

function tt4() {
  console.log(4);
}

// command palette(ctrl-shilf-p)に登録される
atom.commands.add("atom-workspace", {
  "Init: toggleInitPanel": toggleInitPanel,
  "Init: pickUpLine": pickUpLine,
  "Init: pickUp": pickUp,
});

atom.commands.add("atom-text-editor", {
  "Init: tempWork": tempWork,
  "Init: beautifyIncrement": beautifyIncrement,
  "Init: test": test,
  "Init: commentOut": commentOut,
  "Init: enclose": enclose,
  "Init: replacedCopy": replacedCopy,
  "Init: replacedDuplicate": replacedDuplicate,
  "Init: insertRandomNumber": insertRandomNumber,
  "Init: selectLines": selectLines,
  "Init: insertTime": insertTime,
  "Init: jointLines": jointLines,
  "Init: encryption": encryption,
  "Init: decryption": decryption,
  "Init: toCamelCase": toCamelCase,
  "Init: toPascalCase": toPascalCase,
  "Init: toSnakeCase": toSnakeCase,
  "Init: toChainCase": toChainCase,
  "Init: bilateralSymmetry": callBilateralSymmetry,
  "Init: fromCodePoint": fromCodePoint,
  "Init: toCodePoint": toCodePoint,
  "Init: splitLines": splitLines,
  "Init: sumCSV": sumCSV,
  "Init: tt1": tt1,
  "Init: tt2": tt2,
  "Init: tt3": tt3,
  "Init: tt4": tt4,
});

atom.menu.add([{
  "label": "InitScript",
  "submenu": [
    { "label": "toggleInitPanel", "command": "Init: toggleInitPanel" },
    { "label": "pickUpLine", "command": "Init: pickUpLine" },
    { "label": "pickUp", "command": "Init: pickUp" },
    { "label": "tempWork", "command": "Init: tempWork" },
    { "label": "beautifyIncrement", "command": "Init: beautifyIncrement" },
    { "label": "test", "command": "Init: test" },
    { "label": "commentOut", "command": "Init: commentOut" },
    { "label": "enclose", "command": "Init: enclose" },
    { "label": "replacedCopy", "command": "Init: replacedCopy" },
    { "label": "replacedDuplicate", "command": "Init: replacedDuplicate" },
    { "label": "insertRandomNumber", "command": "Init: insertRandomNumber" },
    { "label": "selectLines", "command": "Init: selectLines" },
    { "label": "jointLines", "command": "Init: jointLines" },
    { "label": "insertTime", "command": "Init: insertTime" },
    { "label": "encryption", "command": "Init: encryption" },
    { "label": "decryption", "command": "Init: decryption" },
    { "label": "toCamelCase", "command": "Init: toCamelCase" },
    { "label": "toPascalCase", "command": "Init: toPascalCase" },
    { "label": "toSnakeCase", "command": "Init: toSnakeCase" },
    { "label": "toChainCase", "command": "Init: toChainCase" },
    { "label": "bilateralSymmetry", "command": "Init: bilateralSymmetry" },
    { "label": "fromCodePoint", "command": "Init: fromCodePoint" },
    { "label": "toCodePoint", "command": "Init: toCodePoint" },
    { "label": "splitLines", "command": "Init: splitLines" },
    { "label": "sumCSV", "command": "Init: sumCSV" },
  ],
}]);
atom.menu.update();

/*
atom.contextMenu.add({
  "atom-text-editor": [
    { "label": "enclose1", "command": "commandEnclose1" },
    { "label": "enclose2", "command": "commandEnclose2" },
  ],
});
//*/
