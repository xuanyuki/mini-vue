import { createRoot, ElementTypes, NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

/**
 * @description 解析模板字符串为ast树
 * @returns ast树的根节点
 */
export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

function createParserContext(content) {
  console.log("创建 parserContext");
  return {
    source: content,
  };
}

/**
 * 递归解析子节点
 * @param ancestors 正在解析的元素名称栈，如 <div> 中的 div
 */
function parseChildren(context, ancestors) {
  console.log("开始解析 children");
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;

    if (startsWith(s, "{{")) {
      // 适配vue的插值表达式 {{  }} 中的内容
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      // 适配vue的标签 <  > 中的内容
      if (s[1] === "/") {
        if (/[a-z]/i.test(s[2])) {
          // 消费结束标签
          parseTag(context, TagType.End);
          continue;
        }
      } else if (/[a-z]/i.test(s[1])) {
        // 消费元素标签以及其子节点并生成ast树
        node = parseElement(context, ancestors);
      }
    }

    // 如果当前节点不是插值表达式也不是元素标签，那么就是文本节点
    if (!node) {
      node = parseText(context);
    }
    // 加入到节点列表
    nodes.push(node);
  }

  return nodes;
}

/**
 * 消费插值表达式，将其转为ast节点
 */
function parseInterpolation(context: any) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  // 获取插值表达式的结束索引
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length,
  );

  // 消费 {{
  advanceBy(context, 2);

  // 插值表达式的长度
  const rawContentLength = closeIndex - openDelimiter.length;
  // 截取插值表达式的原始内容
  const rawContent = context.source.slice(0, rawContentLength);
  // 提取插值表达式的原始内容并将context.source推进到 }}
  const preTrimContent = parseTextData(context, rawContent.length);
  const content = preTrimContent.trim();

  // 完成插值表达式的消费
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

/**
 * 检查正在解析的元素是否已经解析完成其内容
 */
function isEnd(context, ancestors) {
  const s = context.source;
  // 如果当前标签是结束标签则查找是否存在匹配的开始标签
  if (startsWith(s, "</")) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }
  return !s;
}

/**
 * 消费元素节点及其子节点
 */
function parseElement(context, ancestors) {
  // 消费开始标签并解析为ast节点
  const element = parseTag(context, TagType.Start);

  ancestors.push(element);
  // 解析子节点
  const children = parseChildren(context, ancestors);
  // 当前节点的子节点全部解析完成后，将当前节点出栈
  ancestors.pop();

  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 如果当前标签是结束标签且标签名称与已解析的开始标签一致，则消费结束标签
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺失结束标签：${element.tag}`);
  }

  // 将解析好的子节点ast树赋值给当前节点的children属性
  element.children = children;

  return element;
}

/**
 * 提取内容并消费
 */
function parseTextData(context: any, length: number): any {
  console.log("解析 textData");
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}

/**
 * 移除context从头开始指定数量的字符
 */
function advanceBy(context, numberOfCharacters) {
  console.log("推进代码", context, numberOfCharacters);
  context.source = context.source.slice(numberOfCharacters);
}

/**
 * 检查字符串是否以结束标签开头，且标签名称与指定的标签名称一致
 */
function startsWithEndTagOpen(source: string, tag: string) {
  return (
    startsWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

/**
 * 解析并消费标签,如果是开始标签则创建ast节点
 */
function parseTag(context: any, type: TagType): any {
  // 匹配标签名称
  const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
  // 标签名称
  const tag = match[1];

  // 消费 < + 标签名称
  advanceBy(context, match[0].length);
  // 此处没有处理自闭合标签
  // 消费 >
  advanceBy(context, 1);

  // 如果是结束标签则不生成ast节点
  if (type === TagType.End) return;

  let tagType = ElementTypes.ELEMENT;

  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType,
  };
}

/**
 * 解析并消费文本节点
 */
function parseText(context): any {
  console.log("解析 text", context);

  const endTokens = ["<", "{{"];
  let endIndex = context.source.length;

  // 找到当前文本节点的结束位置
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}
