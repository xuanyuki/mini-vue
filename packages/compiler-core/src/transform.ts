import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  const context = createTransformContext(root, options);

  traverseNode(root, context);

  createRootCodegen(root, context);
  // root 节点的 helpers 是一个 Set，所以需要使用 add 方法添加元素而不是 push 方法
  root.helpers.add(...context.helpers.keys());
}

/**
 * 递归执行所有子节点的 transform 进行增强
 * 对于 INTERPOLATION 节点，注册 TO_DISPLAY_STRING 运行时函数
 */
function traverseNode(node: any, context) {
  const type: NodeTypes = node.type;
  const nodeTransforms = context.nodeTransforms;
  const exitFns: any = [];
  // 对每个节点按顺序调用所有的nodeTransform
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];

    const onExit = transform(node, context);
    // 收集节点调用 transform 后的回调函数
    if (onExit) {
      exitFns.push(onExit);
    }
  }

  switch (type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;

    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;

    default:
      break;
  }

  let i = exitFns.length;
  // 对每个节点按顺序调用所有的nodeTransform的exit回调函数
  // 注意：exit回调函数的调用顺序与nodeTransform的调用顺序相反
  while (i--) {
    exitFns[i]();
  }
}

/**
 * 设置子节点的 parent，并进行递归
 */
function traverseChildren(parent: any, context: any) {
  parent.children.forEach((node) => {
    context.parent = parent;
    traverseNode(node, context);
  });
}

/**
 * 创建 transform 上下文
 */
function createTransformContext(root, options): any {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    // 运行时函数注册表
    // key: 运行时函数 symbol
    // value: 运行时函数注册次数
    helpers: new Map(),
    // 注册运行时函数并统计注册次数
    helper(name) {
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
    },
  };

  return context;
}

/**
 * 将根节点的唯一子节点上的 codegenNode 提升到根节点，作为代码生成的入口点
 */
function createRootCodegen(root: any, context: any) {
  const { children } = root;
  // 当前demo只支持单根节点的情况，故未作多节点处理
  const child = children[0];

  if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
    const codegenNode = child.codegenNode;
    root.codegenNode = codegenNode;
  } else {
    root.codegenNode = child;
  }
}
