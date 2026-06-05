import { NodeTypes } from "../ast";
import { isText } from "../utils";

/**
 * 合并元素节点的子文本节点和插值节点为 COMPOUND_EXPRESSION 节点
 */
export function transformText(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const children = node.children;
      let currentContainer;

      // 遍历子节点，合并相邻的文本节点和插值节点，并统一标记为 COMPOUND_EXPRESSION 节点
      // 组合后的节点由 + 连接
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  loc: child.loc,
                  children: [child],
                };
              }

              currentContainer.children.push(` + `, next);
              children.splice(j, 1);
              j--;
            } else {
              // 遇到非文本节点，结束合并
              currentContainer = undefined;
              break;
            }
          }
        }
      }
    };
  }
}
