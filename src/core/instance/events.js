/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  // <Child @myclick="onmyclick" />
  // this.$on('myclick', onmyclick)
  // this.$emit('myclick')
  // 事件的派发和监听都是子组件

  // listeners: 从父组件那里拿过来的事件回调函数（onmyclick）
  // 自定义组件中真正做事件 监听的是事件派发者自己，也就是子组件
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  // 把当前组件 this 赋值给target
  // target 会在 add 函数中调用
  // function add (event, fn) {
  //   target.$on(event, fn)
  // }
  target = vm
  // 这里把add函数当参数传入
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  // 已经绑定过事件了, 也就是调用了add 了,则把target 清空
  target = undefined
}

export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    // $on支持同时监听 多个事件以数组形传参
    // 也就是一个回调，可以绑定多个事件
    // this.$on(['evt1', 'evt2'...], cb)
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 把事件名称当key 和回调函数当数组value 存入 _events 对象中
      // 也就意味着 一个事件，也可以绑定多个回调函数
      // 典型的订阅与发布的模式
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup

      // 检测当前组件绑定的事件是否是 hookEvent
      // 如 @hook:updated="handleHookUpdated"
      // const hookRE = /^hook:/
      if (hookRE.test(event)) {
        // 是的话，标记为true 用来给生命周期钩子触发时，
        // 能触发当前绑定的 hookEvent
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 高阶函数，仅执行一次回调fn
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    // 无参数：清除所有的事件监听
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    // 传入事件名称数组
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    // 解除特定事件
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 如果用户没指定fn参数，相关所有回调都清除
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 如果用户指定fn参数，则仅删除该回调
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 获取到当前event这个事件名下的所有回调
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 遍历执行 当前事件的所有回调函数，全都执行
        // 也对应 上面$on 实现订阅与发布
        // 用下面这个函数去执行回调，是怕有异常，其内部做了
        // try catch 异常处理
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
