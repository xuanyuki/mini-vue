import { isString } from "@mini-vue/shared";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  helperNameMap,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";

/**
 * 根据ast树生成render函数的代码
 */
export function generate(ast, options = {}) {
  const context = createCodegenContext(ast, options);
  const { push, mode, deindent } = context;

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

/** 解析复合表达式节点（复合表达式由 文本节点 + 插值节点组成） */
function genCompoundExpression(node: any, context: any) {
  const { push } = context;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
  }
}

/** 解析文本节点 */
function genText(node: any, context: any) {
  const { push } = context;
  push(`'${node.content}'`);
}

/** 为单个元素节点生成 CREATE_ELEMENT_VNODE 的调用代码 */
function genElement(node, context) {
  const { push, helper } = context;
  const { tag, props, children } = node;
  // 插入运行时函数 CREATE_ELEMENT_VNODE 的调用
  push(`${helper(CREATE_ELEMENT_VNODE)}(`);

  genNodeList(genNullableArgs([tag, props, children]), context);

  push(`)`);
}

/** 递归解析ast树，将参数直接加入代码，然后继续解析子结构 */
function genNodeList(nodes: any, context: any) {
  const { push } = context;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
      push(`${node}`);
    } else {
      genNode(node, context);
    }
    if (i < nodes.length - 1) {
      push(", ");
    }
  }
}

/**
 * 处理参数， 将尾部空的去除，中间为 falsy 的值设为 null
 * @returns string[]
 */
function genNullableArgs(args) {
  let i = args.length;
  // 从后往前去掉 null 值的参数
  while (i--) {
    if (args[i] != null) break;
  }
  // 将中间参数为 falsy 的值设为 null
  return args.slice(0, i + 1).map((arg) => arg || "null");
}

/** 对于简单表达式节点直接插入到生成的代码中 */
function genExpression(node: any, context: any) {
  context.push(node.content, node);
}

/** 递归解析插值节点并插入运行时函数调用 */
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
