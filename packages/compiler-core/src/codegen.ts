import { NodeTypes } from "./ast";
import { helperNameMap, TO_DISPLAY_STRING } from "./runtimeHelpers";

export function generate(ast, options = {}) {
  const context = createCodegenContext(ast, options);
  const { push, mode, newline, indent, deindent } = context;

  if (mode === "module") {
    // module 模式下生成 import 风格的导入语句
    genModulePreamble(ast, context);
  } else {
    // function 模式下生成直接从全局Vue实例中解构出的运行时函数
    genFunctionPreamble(ast, context);
  }

  const functionName = "render";

  const args = ["_ctx"];

  const signature = args.join(", ");
  push(`function ${functionName}(${signature}) {`);
  push("return ");
  genNode(ast.codegenNode, context);

  deindent();
  push("}");

  return {
    code: context.code,
  };
}

/**
 * 生成 function 模式下的导入语句
 */
function genFunctionPreamble(ast: any, context: any) {
  const { runtimeGlobalName, push, newline } = context;
  const VueBinging = runtimeGlobalName;

  const aliasHelper = (s) => `${helperNameMap[s]} : _${helperNameMap[s]}`;

  // 当前项目在非 module 模式下，Vue 实例直接注入到window对象中，所以直接从 Vue 实例中获取运行时函数
  if (ast.helpers.length > 0) {
    push(
      `
        const { ${ast.helpers.map(aliasHelper).join(", ")}} = ${VueBinging} 

      `,
    );
  }

  newline();
  push(`return `);
}

function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;

    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;

    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;

    case NodeTypes.TEXT:
      genText(node, context);
      break;

    default:
      break;
  }
}

function genInterpolation(node: any, context: any) {
  const { push, helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(")");
}

/**
 * 生成 esm 模式下的导入语句
 */
function genModulePreamble(ast, context) {
  const { push, newline, runtimeModuleName } = context;

  // 创建导入语句将helpers中需要的运行时名转为导入语句进行导入
  // 如 helpers = ['toDisplayString']
  // 则导入语句为 import { toDisplayString as _toDisplayString } from 'vue'
  if (ast.helpers.length) {
    const code = `import {${ast.helpers
      .map((s) => `${helperNameMap[s]} as _${helperNameMap[s]}`)
      .join(", ")} } from ${JSON.stringify(runtimeModuleName)}`;

    push(code);
  }

  newline();
  push(`export `);
}

/**
 * 创建代码生成上下文
 */
function createCodegenContext(
  ast: any,
  { runtimeModuleName = "vue", runtimeGlobalName = "Vue", mode = "function" },
): any {
  const context = {
    code: "",
    mode,
    runtimeModuleName,
    runtimeGlobalName,
    indentLevel: 0,
    helper(key) {
      return `_${helperNameMap[key]}`;
    },
    push(code) {
      context.code += code;
      context.indentLevel++;
    },
    newline() {
      newline(context.indentLevel);
    },
    indent() {
      newline(++context.indentLevel);
    },
    deindent(withoutNewline = false) {
      if (withoutNewline) {
        --context.indentLevel;
      } else {
        newline(--context.indentLevel);
      }
    },
  };

  function newline(n: number) {
    context.push("\n" + `  `.repeat(n));
  }

  return context;
}
