/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 原型方法 vm.init()
  Vue.prototype._init = function (options?: Object) {
    /*
    面试题： new Vue发生了哪些事
    1. 做了用户配置选项和系统配置选项的合并
    2. 实例相关的属性进了初始化 如: $parent $root $children $refs
    3. 监听自己的自定义事件
    4. 解析自己的插槽
    5. 同时会把自己内部的一些数据进行响应式的处理 如: props(属性) methosds(方法) data computed watch
    */

    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    // 合并选项： new Vue时传入的是用户配置选项，它们需要和系统配置合并

    // 是否是组件
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // Vue初始化走这
      vm.$options = mergeOptions(
        // 默认选项合并，如全局组件 就在此合并到 实例中
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 实例属性的初始化 $parent $root $children $refs
    initLifecycle(vm)
    // 自定义事件的处理
    initEvents(vm)
    //插槽的解析 $slots $scopedSlots
    // $createElement()
    initRender(vm)
    // beforeCreate 之前三个处理都和数据无关，
    // 所以在beforeCreate生命周期中只能访问上面三个操作相关的内容
    // 所以当前周期中是没有数据的，所以在此期间不要做数据操作
    callHook(vm, 'beforeCreate')

    // 接下来都是和组件状态相关的数据操作

    // Vue中有inject与provide两个方法
    // initInjections: 注入祖辈传递下来的数据
    initInjections(vm) // resolve injections before data/props
    // 数据响应式入口: props methosds data computed watch
    initState(vm)
    // 提供给后代，用来隔代传递参数
    initProvide(vm) // resolve provide after data/props
    // 所以在created中可以做数据访问及操作
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 如果设置了el 则自动执行$mount()
    /*
    面试题： 为什么new Vue({el: '#app'})时设置了 el 不用调用$mount
    */
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 获取到实例构造函数Vue上的 全局系统 选项 options
  let options = Ctor.options
  // 如果有继承的父级
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
