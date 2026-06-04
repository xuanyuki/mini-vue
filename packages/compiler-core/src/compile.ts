import { isString } from "@mini-vue/shared";
import { baseParse } from "./parser";

export function baseCompile(source: string, options: any) {
  // 解析 template 字符串为ast树
  const ast = isString(source) ? baseParse(source) : source;
  transform(
    ast,
    Object.assign(options, {
      nodeTransforms: [transformElement, transformText, transformExpression],
    }),
  );
}
