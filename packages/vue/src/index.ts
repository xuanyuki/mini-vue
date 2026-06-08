import * as runtimeDom from "@mini-vue/runtime-dom";
import { baseCompile } from "@mini-vue/compiler-core";
import { extend, isString, NOOP } from "@mini-vue/shared";
import { registerRuntimeCompiler } from "@mini-vue/runtime-core";

function compileToFunction(template: string | HTMLElement, options: any) {
  // 当template是HTMLElement时，需要将HTMLElement转换为字符串
  if (!isString(template)) {
    if (template.nodeType) {
      template = template.innerHTML;
    } else {
      return NOOP;
    }
  }

  // 合并编辑选项
  const opts = extend(
    {
      hoistStatic: true,
    },
    options,
  );

  // 处理自定义元素,用以兼容Web Components规范
  if (!opts.isCustomElement && typeof customElements !== "undefined") {
    opts.isCustomElement = (tag) => !!customElements.get(tag);
  }

  // code: ast树编译后的js代码
  const { code } = baseCompile(template, opts);

  const render = new Function("Vue", code)(runtimeDom);
  return render;
}

registerRuntimeCompiler(compileToFunction);
