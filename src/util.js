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

function getDate(needDay = false, needMillisecond = false) {
  const data = new Date();
  const month = getZeroPadString(data.getMonth() + 1);
  const date = getZeroPadString(data.getDate());
  const day = needDay === true ? `-${getDay(data.getDay())}` : "";
  const hours = getZeroPadString(data.getHours());
  const minutes = getZeroPadString(data.getMinutes());
  const seconds = getZeroPadString(data.getSeconds());
  const milliseconds = needMillisecond === true ? `.${getZeroPadString(data.getMilliseconds(), 3)}` : "";

  return `${data.getFullYear()}-${month}-${date}${day}T${hours}:${minutes}:${seconds}${milliseconds}`;
}

function separate(text, separator = ", *") {
  const re = new RegExp(separator, "gu");
  const separateTexts = [];
  const separators = [];
  let match = re.exec(text);
  let current = 0;
  while (match !== null) {
    separateTexts.push(text.slice(current, match.index));
    separators.push(match[0]);
    current = re.lastIndex !== 0 ? re.lastIndex : current;
    match = re.exec(text);
  }
  if (text.length !== re.lastIndex) {
    separateTexts.push(text.slice(current));
  }

  return { separateTexts, separators };
}

function join(separateTexts, separators, trim = false) {
  const re = / +/u;
  let text = "";
  let i = 0;
  for (i = 0; i < separators.length; ++i) {
    if (trim === true) {
      separators[i] = separators[i].replace(re, " ");
    }
    text += separateTexts[i] + separators[i];
  }
  if (i < separateTexts.length) {
    text += separateTexts[i];
  }
  return text;
}

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
  while (digits - len > 0) {
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
  return Math.floor(Math.random() * diff) + tmin;
}

function getRandomIntegerFormatted(
  { min, max, include = true },
  { digits, radix = 10, upperCase = false, paddingChar = "0", sign = "minus", align = "right" }
) {
  const result = getRandomInteger(min, max, include);
  return toPaddedString({ num: result, radix, digits, upperCase, paddingChar, sign, align });
}

/**
 * strの前後にマッチするsourceを削除する
 * @param {string} str
 * @param {string} source
 */
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

// function matchForEach(re, str, func, join = false) {
//   let matchResult = str.match(re);
//   if (matchResult === null) {
//     if (join === true) {
//       return str;
//     }
//     return [str];
//   }

//   for (let i = 0; i < matchResult.length; ++i) {
//     matchResult[i] = func(matchResult[i]);
//   }
//   if (join === true) {
//     matchResult = matchResult.join("");
//   }
//   return matchResult;
// }

function replace(string = "", { repl = "", start = 0, end = start + repl.length }) {
  return `${string.slice(0, start)}${repl}${string.slice(end)}`;
}

function toCamelCase(text, upper = false) {
  const trim = "[ _-]";
  const re = /[ _-][a-zA-Z]/g;
  let result = text;
  let repl = "";

  result = trimRegex(result, trim);
  result = reExecForEach(re, result, (str, execResult) => {
    repl = str.charAt(execResult.index + 1).toUpperCase();
    return replace(str, { repl, start: execResult.index, end: execResult.index + 2 });
  });

  if (upper === true) {
    repl = result.charAt(0).toUpperCase();
  } else {
    repl = result.charAt(0).toLowerCase();
  }

  return replace(result, { repl, end: 1 });
}

// str.replace(/([A-Z])/g, "_$1");
// 大文字小文字の違いを保存したいのでこんな感じに
function toSnakeCase(text, combinator = "_", lower = false) {
  const re = /.[A-Z]/g;
  let result = text;
  const reCom = new RegExp(`${combinator}{2,}`, "g");

  result = reExecForEach(re, result, (str, execResult) => {
    return replace(str, {
      repl: `${combinator}${str.charAt(execResult.index + 1)}`,
      start: execResult.index + 1,
      end: execResult.index + 2,
    });
  });
  if (/_?([A-Za-z]+_?)+/.test(result) === true) {
    // snakeCaseに相当するものだけが対象
    result = result.replace(/[ _-]/g, combinator);
    result = result.replace(reCom, combinator);
    if (lower === true) {
      result = result.toLowerCase();
    }
  }

  return result;
}

////////////////////////////////////////////////////////////////////////////////
// exports
////////////////////////////////////////////////////////////////////////////////

exports.separate = separate;
exports.join = join;

exports.getDate = getDate;
exports.getRandomIntegerFormatted = getRandomIntegerFormatted;

exports.toCamelCase = toCamelCase;
exports.toSnakeCase = toSnakeCase;
