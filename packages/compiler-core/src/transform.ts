export function transform(root, options = {}) {
  // 1. 创建 context

  const context = createTransformContext(root, options);

  // 2. 遍历 node
  traverseNode(root, context);

  createRootCodegen(root, context);

  root.helpers.push(...context.helpers.keys());
}
