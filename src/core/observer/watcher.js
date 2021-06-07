/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    // 是否是渲染watch, 不是则是用户写的业务watch
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      // 赋值 updateComponent 函数给getter方法
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 如果是初始化的渲染watch lazy为fase
    // 则会先调用一次get方法
    // get方法中会调用次 updateComponent 完成初始化渲染
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 用于依赖收集
    // targetStack.push(target)
    // Dep.target = target
    pushTarget(this)

    /**
    看完 get 函数肯定会有点懵逼
     Dep.target = target
     赋值后给谁用？
     难道不是 为了 在调用数据时 触发 Object.defineProperty
     方法的get 函数  再给Dep 做依赖收集吗 ？
     尴尬的是此处没看到有 this.name  .xxx 这种get操作 ！！

     其实想想 接下来的 this.getter 函数， 实质调用的就是 updateComponent 方法
     而 updateComponent 方法中又调用了 _render 方法
          vm._update(vm._render(), hydrating)
     render方法中要把节点转成虚拟dom  刚好不就用到了 响应式数据吗
       render(h) {
          return h("a", { attrs: { href: `#${this.to}` } }, this.$slots.default);
        }
     所以 就是render函数触发了数据调用  进而促成 watcher 的收集
    * */

    let value
    const vm = this.vm
    try {
      // 调用getter方法，即调用 updateComponent 方法
      // 并把this指向Vue实例，并传参过去
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 是否深度监听
      if (this.deep) {
        traverse(value)
      }
      // targetStack.pop()
      // Dep.target = targetStack[targetStack.length - 1]
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 相互添加引用
    if (!this.newDepIds.has(id)) {
      // watcher添加到dep
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // dep 添加watcher
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 数据变更时，dep中收集了依赖watcher 会遍历执行组件watcher的update方法
  update () {
    /* istanbul ignore else */

    // 属性更新时会触发user-watcher所定义的回调函数（将新旧值传入），支持异步操作
    // this.$watch()
    /*
    {
      watch: {
        count: {
          deep: true,
          handler(newV, oldV){

          }
        }
      }
    }
    */
    // 配置项有以下三种
      // immediate  为true时会将实例作为参数传入立即执行回调函数
      // deep 对对象、数组进行深度的依赖收集
      // sync 不把更新watcher放到nextTick队列 而是立即执行更新

    // 懒执行 比如 computed
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      // $watch 有个sync属性
      // 同步更新
      this.run()
    } else {
      // 加入 watch 队列
      // 相同的watch只会加入一次 通过watcher.id 判断
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      // 调用了get方法 即调用了  updateComponent方法
      // 组件级别的watcher只走下面的 get方法
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
