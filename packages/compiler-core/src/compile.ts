import { isString } from "@mini-vue/shared";
import { baseParse } from "./parser";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformText } from "./transforms/transformText";

export function baseCompile(source: string, options: any) {
  // 解析 template 字符串为ast树
  const ast = isString(source) ? baseParse(source) : source;
  // 增强 ast 树
  transform(
    ast,
    Object.assign(options, {
      nodeTransforms: [transformElement, transformText, transformExpression],
    }),
  );
}
