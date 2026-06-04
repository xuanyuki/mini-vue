import { createVNodeCall, NodeTypes } from "../ast";

/**
 * 处理元素节点
 */
export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      // 没有实现 block  所以这里直接创建 element
      const vnodeTag = `'${node.tag}'`;
      // TODO: props
      let vnodeProps = null;
      if (node.props && node.props.length > 0) {
      }
      let vnodeChildren = null;
      // TODO: slot
      if (node.children.length > 0) {
        if (node.children.length === 1) {
          // 只有一个子节点的节点直接将子节点作为 children
          const child = node.children[0];
          vnodeChildren = child;
        } else {
          vnodeChildren = node.children;
        }
      }

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren,
      );
    };
  }
}
