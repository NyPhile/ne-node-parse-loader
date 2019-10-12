const fs = require('fs');
const path = require('path');
const request = require('request')
const iconv = require('iconv-lite')

const handleRawFile = file => {
  return String(file).replace(/<\!--\\#/g, () => '<!--#');
};

const flatArray = (source, target = []) => {
  if (!Array.isArray(target)) {
    throw new Error('target必须是数组');
  }
  const stack = [source];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (Array.isArray(cur)) {
      cur.forEach(each => stack.push(each));
    } else {
      target.unshift(cur);
    }
  }
  return target;
};
const parseReg = /<%=([\s\S]+?)%>|<%#([\s\S]+?)%>|<%-([\s\S]+?)%>|<%@([\s\S]+?)%>|<%([\s\S]+?)%>|\{\!?\{([^}]+)\}\}/g;
const safeRegExp = /(^|\s|[\(,;])([\w\.\[\]]+)\?(?=$|\s*[\),;])/g;
const jsMap = {
  "'": "\\'",
  '\\': '\\\\',
  '\r': '\\r',
  '\n': '\\n',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};
const jsdelBreakMap = {
  "'": "\\'",
  '\\': '\\',
  '\r': '',
  '\n': '',
  '\u2028': '',
  '\u2029': '',
};
const htmlMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};
const jsEscReg = /\\|'|\r|\n|\u2028|\u2029/g;
const htmlEscReg = new RegExp(`(?:${Object.keys(htmlMap).join('|')})`, 'g');
const escpaer = (map, reg) => input => input.replace(reg, match => map[match]);

const jsEscaper = escpaer(jsMap, jsEscReg);
const jsdelBreakEscaper = escpaer(jsdelBreakMap, jsEscReg);
const __htmlEscaper = escpaer(htmlMap, htmlEscReg);

global.__htmlEscaper = __htmlEscaper;
const safeExpr = expr =>
  expr.replace(safeRegExp, "$1(typeof $2=='undefined'?null:$2)");

const executeDouble = (exp, match) => {
  exp = safeExpr(exp);
  let str = `(__t = (${exp})) == null ? `;
  if (match.substr(1, 1) === '!') {
    str += "''";
  } else {
    str += `'${jsEscaper(exp)}'`;
  }
  str += ' : __t';
  return str;
};
const executeExp = (exp, escape) => {
  let str = `(__t = (${exp})) == null ? '' : `;
  if (escape) {
    str = `${str}__htmlEscaper(__t)`;
  } else {
    str += '__t';
  }
  return str;
};
const start = "let __t, buf = [];\nbuf.push('";
const end = "');\nreturn buf.join('');";
const prePost = {
  printPrfix: "',\n(",
  printPostfix: "),'",
  execPrfix: "');\n",
  execPostfix: "\nbuf.push('",

  printDebug: ',',
  execDebug: ';',
};
const cutTemplate = (type, body, debug) => {
  let prefix = prePost[`${type}Prfix`];
  const postfix = prePost[`${type}Postfix`];
  if (debug) {
    prefix += debug + prePost[`${type}Debug`];
  }
  return prefix + body + postfix;
};

const parseFile = ({ file, opt, lineno = 0, debugstr = '' } = {}) => {
  const { debug, myJsEscaper } = opt;
  let lastIndex = 0;
  const blocks = [];

  file.replace(parseReg, (
    match,
    directPrint,
    notHandle,
    escapePrint,
    includeFile,
    execJs,
    doublePrint,
    offset
  ) => {
    const commonstr = file.slice(lastIndex, offset);
    if (debug) {
      lineno += commonstr.split('\n').length - 1;
      debugstr = `__line = ${lineno + 1}`;
    }
    blocks.push(myJsEscaper(commonstr));
    // template += myJsEscaper(commonstr);
    if (directPrint) {
      blocks.push(cutTemplate('print', executeExp(directPrint), debugstr));
    } else if (notHandle) {
      blocks.push(myJsEscaper(notHandle));
    } else if (escapePrint) {
      blocks.push(
        cutTemplate('print', executeExp(escapePrint, 'escape'), debugstr)
      );
    } else if (execJs) {
      blocks.push(cutTemplate('exec', execJs, debugstr));
    } else if (doublePrint) {
      blocks.push(
        cutTemplate('print', executeDouble(doublePrint, match), debugstr)
      );
    } else if (includeFile) {
      blocks.push(handleInclude({ includeFile, opt, lineno, debugstr }));
    }
    if (debug) {
      lineno += match.split('\n').length - 1;
    }
    lastIndex = offset + match.length;
    return match;
  });
  blocks.push(myJsEscaper(file.slice(lastIndex)));
  return Promise.all(blocks);
};

function handleInclude({ includeFile, opt, lineno, debugstr }) {
  console.log('root:' + opt.root)
  console.log('includeFile:' + includeFile.trim())
  let matches = /.?\/([\d]{4})\/[\w]+\/[\d]{4}([^\.]*)\.vm.?/.exec(includeFile.trim())
  let channelid = '0001', modelid = ''
  if (matches) {
    channelid = matches[1]
    modelid = matches[2]
  }
  let domain = opt.root.find(item => item.channelid == channelid)
  domain = domain.value

  let includeFileURL = `https://${domain}.163.com/special/sp/${modelid}.html`
  return new Promise((resolve, reject) => {
    request({
      url: includeFileURL
    }, (err, response, body) => {
      let content = ''
      let remoteCharset = 'GBK'
      if (response.statusCode == 404) {
        content = `<!-- vm404, path:${includeFile}, 请检查路径 -->`
      } else {
        content = remoteCharset ? iconv.decode(body, remoteCharset).toString() : body
      }
      if (err) return reject(err)
      resolve(
        parseFile({
          opt,
          lineno,
          debugstr,
          file: content,
        })
      )
    })
  })
  // return new Promise((resolve, reject) => {
  //   const includeFilePath = path.join(opt.root, includeFile.trim());
  //   fs.readFile(includeFilePath, (ioErr, file) => {
  //     if (ioErr) {
  //       reject(ioErr);
  //     } else {
  //       const getedFile = handleRawFile(file);
  //       resolve(
  //         parseFile({
  //           opt,
  //           lineno,
  //           debugstr,
  //           file: getedFile,
  //         })
  //       );
  //     }
  //   });
  // });
}

const parse = (opt, file) => {
  return parseFile({ file, opt }).then(blocks => {
    return `${start}${flatArray(blocks).join('')}${end}`;
  });
};

//
// file:模板字符串
// opt {
//     debug: 是否开启debug
//     root: 根路径(处理parse)
// }

const render = (file, opt) => {
  let {debug, root, delBreak} = opt
  return parse(
    {
      myJsEscaper: delBreak ? jsdelBreakEscaper : jsEscaper,
      debug,
      root
    },
    file
  ).then(main => {
    let handelFn = () => '';
    let template = '';
    if (debug) {
      template = `
      try {
        let __line = 1;
        function __errHandle(e) {
          e.message = '错误开始于模板' + __line + '行 ' + '执行报错:' + e.message;
          throw e;
        }
        ${main}
      } catch (e) {
        return __errHandle(e)
      }`;
    } else {
      template = main;
    }
    try {
      handelFn = new Function('data', template);
    } catch (createFnErr) {
      if (debug) {
        createFnErr.message = template;
        createFnErr.stack = '';
      } else {
        createFnErr.message = `创建渲染函数语法报错:${createFnErr.message}`;
      }
      throw createFnErr;
    }
    return handelFn;
  });
};

module.exports = (file, debug = true, root) => {
  if (!file) {
    throw new Error('file参数不存在');
  }
  return render(file, { debug, root });
};
