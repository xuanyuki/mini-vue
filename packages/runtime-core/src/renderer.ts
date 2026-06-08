export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setText: hostSetText,
    createText: hostCreateText,
  } = options;

  const render = (vnode, container) => {
    console.log("调用 patch");
    patch(null, vnode, container);
  };

  function patch(
    n1,
    n2,
    container = null,
    anchor = null,
    parentComponent = null,
  ) {
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          console.log("处理 element");
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          console.log("处理 component");
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }

  function processFragment(n1: any, n2: any, container: any) {
    if (!n1) {
      console.log("初始化 Fragment 类型的节点");
      mountChildren(n2.children, container);
    }
  }

  function processText(n1, n2, container) {
    console.log("处理 Text 节点");
    if (n1 === null) {
      // n1 是 null 说明是 init 的阶段
      // 基于 createText 创建出 text 节点，然后使用 insert 添加到 el 内
      console.log("初始化 Text 类型的节点");
      hostInsert((n2.el = hostCreateText(n2.children as string)), container);
    } else {
      // update
      // 先对比一下 updated 之后的内容是否和之前的不一样
      // 在不一样的时候才需要 update text
      // 这里抽离出来的接口是 setText
      // 注意，这里一定要记得把 n1.el 赋值给 n2.el, 不然后续是找不到值的
      const el = (n2.el = n1.el!);
      if (n2.children !== n1.children) {
        console.log("更新 Text 类型的节点");
        hostSetText(el, n2.children as string);
      }
    }
  }

  function processElement(n1, n2, container, anchor, parentComponent) {
    if (!n1) {
      mountElement(n2, container, anchor);
    } else {
      // todo
      updateElement(n1, n2, container, anchor, parentComponent);
    }
  }

  function updateElement(n1, n2, container, anchor, parentComponent) {
    const oldProps = (n1 && n1.props) || {};
    const newProps = n2.props || {};
    // 应该更新 element
    console.log("应该更新 element");
    console.log("旧的 vnode", n1);
    console.log("新的 vnode", n2);

    // 需要把 el 挂载到新的 vnode
    const el = (n2.el = n1.el);

    // 对比 props
    patchProps(el, oldProps, newProps);

    // 对比 children
    patchChildren(n1, n2, el, anchor, parentComponent);
  }

  function patchProps(el, oldProps, newProps) {
    // 对比 props 有以下几种情况
    // 1. oldProps 有，newProps 也有，但是 val 值变更了
    // 举个栗子
    // 之前: oldProps.id = 1 ，更新后：newProps.id = 2

    // key 存在 oldProps 里 也存在 newProps 内
    // 以 newProps 作为基准
    for (const key in newProps) {
      const prevProp = oldProps[key];
      const nextProp = newProps[key];
      if (prevProp !== nextProp) {
        // 对比属性
        // 需要交给 host 来更新 key
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }

    // 2. oldProps 有，而 newProps 没有了
    // 之前： {id:1,tId:2}  更新后： {id:1}
    // 这种情况下我们就应该以 oldProps 作为基准，因为在 newProps 里面是没有的 tId 的
    // 还需要注意一点，如果这个 key 在 newProps 里面已经存在了，说明已经处理过了，就不要在处理了
    for (const key in oldProps) {
      const prevProp = oldProps[key];
      const nextProp = null;
      if (!(key in newProps)) {
        // 这里是以 oldProps 为基准来遍历，
        // 而且得到的值是 newProps 内没有的
        // 所以交给 host 更新的时候，把新的值设置为 null
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }
  }

  function patchChildren(n1, n2, container, anchor, parentComponent) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;

    // 如果 n2 的 children 是 text 类型的话
    // 就看看和之前的 n1 的 children 是不是一样的
    // 如果不一样的话直接重新设置一下 text 即可
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (c2 !== c1) {
        console.log("类型为 text_children, 当前需要更新");
        hostSetElementText(container, c2 as string);
      }
    } else {
      // 看看之前的是不是 text
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 先清空
        // 然后在把新的 children 给 mount 生成 element
        hostSetElementText(container, "");
        mountChildren(c2, container);
      } else {
        // array diff array
        // 如果之前是 array_children
        // 现在还是 array_children 的话
        // 那么我们就需要对比两个 children 啦
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1: any[],
    c2: any[],
    container,
    parentAnchor,
    parentComponent,
  ) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    const isSameVNodeType = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key;
    };

    while (i <= e1 && i <= e2) {
      const prevChild = c1[i];
      const nextChild = c2[i];

      if (!isSameVNodeType(prevChild, nextChild)) {
        console.log("两个 child 不相等(从左往右比对)");
        console.log(`prevChild:${prevChild}`);
        console.log(`nextChild:${nextChild}`);
        break;
      }

      console.log("两个 child 相等，接下来对比这两个 child 节点(从左往右比对)");
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      i++;
    }

    while (i <= e1 && i <= e2) {
      // 从右向左取值
      const prevChild = c1[e1];
      const nextChild = c2[e2];

      if (!isSameVNodeType(prevChild, nextChild)) {
        console.log("两个 child 不相等(从右往左比对)");
        console.log(`prevChild:${prevChild}`);
        console.log(`nextChild:${nextChild}`);
        break;
      }
      console.log("两个 child 相等，接下来对比这两个 child 节点(从右往左比对)");
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      e1--;
      e2--;
    }

    if (i > e1 && i <= e2) {
      // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
      // 也就是说新增了 vnode
      // 应该循环 c2
      // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
      // 要添加的位置是当前的位置(e2 开始)+1
      // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
      // 所以我们需要从 e2 + 1 取到锚点的位置
      const nextPos = e2 + 1;
      const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
      while (i <= e2) {
        console.log(`需要新创建一个 vnode: ${c2[i].key}`);
        patch(null, c2[i], container, anchor, parentComponent);
        i++;
      }
    } else if (i > e2 && i <= e1) {
      // 这种情况的话说明新节点的数量是小于旧节点的数量的
      // 那么我们就需要把多余的
      while (i <= e1) {
        console.log(`需要删除当前的 vnode: ${c1[i].key}`);
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 左右两边都比对完了，然后剩下的就是中间部位顺序变动的
      // 例如下面的情况
      // a,b,[c,d,e],f,g
      // a,b,[e,c,d],f,g

      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = new Map();
      let moved = false;
      let maxNewIndexSoFar = 0;
      // 先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
      // 时间复杂度是 O(1)
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 需要处理新节点的数量
      const toBePatched = e2 - s2 + 1;
      let patched = 0;
      // 初始化 从新的index映射为老的index
      // 创建数组的时候给定数组的长度，这个是性能最快的写法
      const newIndexToOldIndexMap = new Array(toBePatched);
      // 初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;

      // 遍历老节点
      // 1. 需要找出老节点有，而新节点没有的 -> 需要把这个节点删除掉
      // 2. 新老节点都有的，—> 需要 patch
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];

        // 优化点
        // 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        let newIndex;
        if (prevChild.key != null) {
          // 这里就可以通过key快速的查找了， 看看在新的里面这个节点存在不存在
          // 时间复杂度O(1)
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // 如果没key 的话，那么只能是遍历所有的新节点来确定当前节点存在不存在了
          // 时间复杂度O(n)
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        // 因为有可能 nextIndex 的值为0（0也是正常值）
        // 所以需要通过值是不是 undefined 或者 null 来判断
        if (newIndex === undefined) {
          // 当前节点的key 不存在于 newChildren 中，需要把当前节点给删除掉
          hostRemove(prevChild.el);
        } else {
          // 新老节点都存在
          console.log("新老节点都存在");
          // 把新节点的索引和老的节点的索引建立映射关系
          // i + 1 是因为 i 有可能是0 (0 的话会被认为新节点在老的节点中不存在)
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // 来确定中间的节点是不是需要移动
          // 新的 newIndex 如果一直是升序的话，那么就说明没有移动
          // 所以我们可以记录最后一个节点在新的里面的索引，然后看看是不是升序
          // 不是升序的话，我们就可以确定节点移动过了
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }

          patch(prevChild, c2[newIndex], container, null, parentComponent);
          patched++;
        }
      }

      // 利用最长递增子序列来优化移动逻辑
      // 因为元素是升序的话，那么这些元素就是不需要移动的
      // 而我们就可以通过最长递增子序列来获取到升序的列表
      // 在移动的时候我们去对比这个列表，如果对比上的话，就说明当前元素不需要移动
      // 通过 moved 来进行优化，如果没有移动过的话 那么就不需要执行算法
      // getSequence 返回的是 newIndexToOldIndexMap 的索引值
      // 所以后面我们可以直接遍历索引值来处理，也就是直接使用 toBePatched 即可
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;

      // 遍历新节点
      // 1. 需要找出老节点没有，而新节点有的 -> 需要把这个节点创建
      // 2. 最后需要移动一下位置，比如 [c,d,e] -> [e,c,d]

      // 这里倒循环是因为在 insert 的时候，需要保证锚点是处理完的节点（也就是已经确定位置了）
      // 因为 insert 逻辑是使用的 insertBefore()
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 确定当前要处理的节点索引
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        // 锚点等于当前节点索引+1
        // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;

        if (newIndexToOldIndexMap[i] === 0) {
          // 说明新节点在老的里面不存在
          // 需要创建
          patch(null, nextChild, container, anchor, parentComponent);
        } else if (moved) {
          // 需要移动
          // 1. j 已经没有了 说明剩下的都需要移动了
          // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            // 移动的话使用 insert 即可
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }

  function mountElement(vnode, container, anchor) {
    const { shapeFlag, props } = vnode;
    const el = (vnode.el = hostCreateElement(vnode.type));

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      console.log(`处理文本:${vnode.children}`);
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el);
    }

    // 处理 props
    if (props) {
      for (const key in props) {
        const nextVal = props[key];
        hostPatchProp(el, key, null, nextVal);
      }
    }

    console.log("vnodeHook  -> onVnodeBeforeMount");
    console.log("DirectiveHook  -> beforeMount");
    console.log("transition  -> beforeEnter");

    hostInsert(el, container, anchor);

    console.log("vnodeHook  -> onVnodeMounted");
    console.log("DirectiveHook  -> mounted");
    console.log("transition  -> enter");
  }

  function mountChildren(children, container) {
    children.forEach((VNodeChild) => {
      console.log("mountChildren:", VNodeChild);
      patch(null, VNodeChild, container);
    });
  }

  function processComponent(n1, n2, container, parentComponent) {
    if (!n1) {
      mountComponent(n2, container, parentComponent);
    } else {
      updateComponent(n1, n2, container);
    }
  }

  function updateComponent(n1, n2, container) {
    console.log("更新组件", n1, n2);
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      console.log(`组件需要更新: ${instance}`);
      instance.next = n2;
      instance.update();
    } else {
      console.log(`组件不需要更新: ${instance}`);
      n2.component = n1.component;
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  function mountComponent(initialVNode, container, parentComponent) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
    ));
    console.log(`创建组件实例:${instance.type.name}`);
    setupComponent(instance);

    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance, initialVNode, container) {
    function componentUpdateFn() {
      if (!instance.isMounted) {
        console.log(`${instance.type.name}:调用 render,获取 subTree`);
        const proxyToUse = instance.proxy;
        const subTree = (instance.subTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse),
        ));
        console.log("subTree", subTree);

        console.log(`${instance.type.name}:触发 beforeMount hook`);
        console.log(`${instance.type.name}:触发 onVnodeBeforeMount hook`);

        patch(null, subTree, container, null, instance);
        initialVNode.el = subTree.el;

        console.log(`${instance.type.name}:触发 mounted hook`);
        instance.isMounted = true;
      } else {
        console.log(`${instance.type.name}:调用更新逻辑`);
        const { next, vnode } = instance;

        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }

        const proxyToUse = instance.proxy;
        const nextTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse),
        );
        const prevTree = instance.subTree;
        instance.subTree = nextTree;

        console.log(`${instance.type.name}:触发 beforeUpdated hook`);
        console.log(`${instance.type.name}:触发 onVnodeBeforeUpdate hook`);

        patch(prevTree, nextTree, prevTree.el, null, instance);

        console.log(`${instance.type.name}:触发 updated hook`);
        console.log(`${instance.type.name}:触发 onVnodeUpdated hook`);
      }
    }

    instance.update = effect(componentUpdateFn, {
      scheduler: () => {
        queueJob(instance.update);
      },
    });
  }

  function updateComponentPreRender(instance, nextVNode) {
    nextVNode.component = instance;

    instance.vnode = nextVNode;
    instance.next = null;

    const { props } = nextVNode;
    console.log("更新组件的 props", props);
    instance.props = props;
    console.log("更新组件的 slots");
  }

  return {
    render,
    createApp: createAppAPI(render),
  };
}
