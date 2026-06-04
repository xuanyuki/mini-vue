export const enum NodeTypes {
  // 文本节点
  TEXT,
  // 根节点
  ROOT,
  // 插值节点
  INTERPOLATION,
  // 简单表达式节点
  SIMPLE_EXPRESSION,
  // 元素节点
  ELEMENT,
  // 复合表达式节点
  COMPOUND_EXPRESSION,
}

/**
 * 创建ast树的根节点
 */
export function createRoot(children: [], source = "") {
  return {
    type: NodeTypes.ROOT,
    source,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: [],
    temps: 0,
  };
}

export const enum ElementTypes {
  ELEMENT,
}
