/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
// 组件虚似dom的钩子 非 程序运行的生命周期钩子
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    // 如果当前组件是缓存的，存在keep-alive中的组件
    // 直接从缓存中获取，不需要再创建
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      // 当前组件被包裹在keep-alive中时的处理
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      // 通常走这里 初始化
      // 获取组件的实例化
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      // 并执行挂载
      // parent  created
          // child created
          // child mounted
      // parent  mounted
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },
  // 更新钩子
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }

  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
/*  Vue.component('comp', {
    template: '<div>{{name}}</div>',
    data() {
      return {
        name: 'xxx'
      }
    }
  })*/
  // 标准化处理，如果传入的组件 构造器 不是函数是一个对象
  if (isObject(Ctor)) {
    // 则通过 Vue.extend方法转换成 构造函数
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  // 异步组件处理
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  // 处理自定义组件各个选项
  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor)


  /*
    Vue.component('comp', {
      model: { prop: 'abcd', event: 'xxx'},
      props: { abcd: String },
      template: `<input type="text" :value="abcd" @input="$emit('xxx', $event.target.value)" />`
    })

   // 调用
   <comp v-model="selectFramework" />
  */

  // transform component v-model data into props & events
  // 组件options 中存在model选项时，即代表有设置 自定义v-model的配置
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // 函数式组件
  if (isTrue(Ctor.options.functional)) {
  /*
  {
    functional: true,
    props: {},
    render(h){
      return h('a')
    }
  }
  */
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners

  // 事件监听的处理
  // 自定义事件
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 原生事件
  data.on = data.nativeOn



  /*
   import {get, debounce, set} from 'loadsh';
    export default {
        name: 'debounce',
        abstract: true, //标记为抽象组件
        render({ data }) {
            let vnode = this.$slots.default[0]; // 子组件的vnode
            if (vnode) {
                let event = get(vnode, `data.on.click`); // 子组件绑定的click事件
                if (typeof event === 'function') {
                    set(vnode, `data.on.click`, debounce(event, 1000));
                }
            }
            return vnode;
        }
    };

  <debounce>
      <button @click="clickHandler">测试</button>
  </debounce>
  */

  // 抽象组件 如 <keep-alive>、<transition>、<transition-group>
  // 它们都有一个属性 abstract 为 true，表明是它一个抽象组件
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  // 安装自定义组件管理钩子， 比如初始化钩子init等
  installComponentHooks(data)

  // return a placeholder vnode
  // 返回自定义组件vnode
  const name = Ctor.options.name || tag
  // 定义组件名称
  const vnode = new VNode(
    // vue-component-1-comp
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}

export function createComponentInstanceForVnode (
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any
): Component {
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // new 组件的构造函数， 放在了vnode.componentOptions.Ctor中
  return new vnode.componentOptions.Ctor(options)
}

function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  // 合并同户和默认管理钩子
  // hooksToMerge： componentVNodeHooks 钩子的key数组
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}

function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data: any) {
  // 如果用户有定义自定义的属性名称或者事件名称
  // 则使用它，否则使用默认的value和input
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value
  // v-model="foo" @input="onInput"
  // 如查用户使用了v-model 又监听了input事件
  const on = data.on || (data.on = {})
  // 则先获取到用户监听的input事件回调
  const existing = on[event]
  // v-model 处理的回调
  const callback = data.model.callback
  // 如果有户监听的input事件存在
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      // 把v-model 处理的回调 和 用户监听的input事件 回调
      // 合并成一个数组统一 当成input 事件的回调处理
      on[event] = [callback].concat(existing)
    }
  } else {
    // 没用户监听的input事件存在
    // 则只处理 v-model 的回调
    on[event] = callback
  }
  // 从上可看出  事件处理统一放到了 data.on 上管理
}
