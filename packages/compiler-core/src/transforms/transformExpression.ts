import { NodeTypes } from "../ast";

/**
 * 将插值节点的内容转为 _ctx.${content}
 */
export function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content);
  }
}

function processExpression(node) {
  node.content = `_ctx.${node.content}`;

  return node;
}
