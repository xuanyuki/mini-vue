import { NodeTypes } from "./ast";

/**
 * 判断节点是否是文本节点或插值节点
 */
export function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}
