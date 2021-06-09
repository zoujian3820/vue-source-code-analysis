/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  // 初始化 computed
  if (opts.computed) initComputed(vm, opts.computed)
  // 初始化watch
  if (opts.watch && opts.watch !== nativeWatch) {
    // 组件内部存在用户watch 则初始化 调用 vm.$watch
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 校验，避免命名冲突，前面有使用，后面的就不能命名
  // 顺序： props methosds data computed watch
  // 如 props 中有一个name属性，则后面都不能使用name命名

  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  // 递归的响应式处理
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

// 配置项 标明 lazy为true 传给watcher做初始化用
const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // watchers： 创建的 _computedWatchers 对象放在实例this上  并用key 来存对应的 watcher
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

/*  {
    computed: {
      count() {
        return this.list.length
      },
      lens: {
        get() {
          return this.abs.length
        },
        set(v) {
          this.abs.push(v)
        }
      }
    }
  }*/
  // 遍历 computed 拿到 对应的配置
  for (const key in computed) {
    // 获取 key 对应的函数方法，或存取器配置
    const userDef = computed[key]
    // 获取 get 取值方法
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    // 不是服务端渲染
    if (!isSSR) {
      // create internal watcher for the computed property.
      // 一个key对应一个 Watcher
      watchers[key] = new Watcher(
        vm, // Vue 实例this
        getter || noop, // computed get 方法
        noop,
        computedWatcherOptions // 配置 { lazy: true }
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 确定 当前的computed key 是否没被其他地方设置过 如data methods props 等 可能重名
    if (!(key in vm)) {
      // 给Vue实例this 定义 definedProperty 存取器
      // 并以 computed 的key  作key 使用 这样就可直接 this调用  this.xxxx
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any, // Vue 实例this
  key: string, // computed 的 key
  userDef: Object | Function // computed  key 对应的函数方法，或存取器配置
) {
  // 是否非服务端渲染
  const shouldCache = !isServerRendering()
  /*    const sharedPropertyDefinition = {
      enumerable: true,
      configurable: true,
      get: noop,
      set: noop
    }*/

  // 如果 computed是写的函数配置，则没有定义set
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key) // 不是服务端渲染走这个 反回一个get 方法
      : createGetterInvoker(userDef) // 否则走这个 同样反回一个get 方法
    sharedPropertyDefinition.set = noop
  } else {
    // 否则computed写的是对象配置，则可能定义了set
    sharedPropertyDefinition.get = userDef.get
      // 不是服务端渲染 并且 没设cache属性
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)  // 反回一个get 方法
        : createGetterInvoker(userDef.get)  // 同样反回一个get 方法
      : noop
    // 有set 则赋值 set
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }

  // 劫持computed 的数据获取与修改，并挂载在Vue 实例this上
  // 所以computed 的调用，不会跑defineReactive中的get劫持，而是跑的这里
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  // 反回封装过的get 方法， 当页面中调用 computed 中的这个key时，才会走computedGetter内部方法
  // 所以computed 的调用，不会跑defineReactive中的get劫持，而是跑的这里
  // 因为初始化时，没在 observe中处理，像data 则传入了 observe 中

  /*
    在跑页面时，初始化 跑了 mountComponent 内部 new Watcher 并把 updateComponent 当参
    则初始化就做了一次依赖收集  则targetStack 中已经有了一个 组件渲染Watcher
    此时 targetStack为 [渲染wathcer]
    接着跑render 时 如果遇到 computed $watch 的值 如下面的 computed: count
    就会触发get 并执行第二次依赖收集，即跑到下面 computedGetter 函数中了
    此时内部  watcher.evaluate() 执行了 watcher的get方法 get方法又 pushTarget
    此时 targetStack为 [渲染wathcer, computed的wathcer]
    接着调用 computed count的get 函数 count() { return this.list.length }
    则computed Watcher 被 list 的defineReactive 做依赖收集,
    此时 list 的dep上收集的watcher为 [computed Watcher]

    当list发生变更，则执行computed Watcher的update方法，其内部只是把 dirty 更新为 true
          dirty 只有在初始化时，设为了true, 而每次 computedGetter 执行了后，都会设为 false
          只有等数据发生变化执行过 computed Watcher 时（dirty 改为了 true）
          才会再次运行 computedGetter（这里就是缓存的原理）
          因为 computedGetter  执行时，都加了判断 dirty 为true才往下走

         正常更新时 deps中顺序为[computed Watcher, 组件渲染watcher]
         所以是先执行 computed Watcher 把dirty 更新为 true  再执行 组件渲染watcher 调用 computedGetter 获取计算值

    并且dep 与watcher 是双向收集的, 所以这里也给当前computed wathcer收集了list的dep

    export function popTarget () {
      targetStack.pop()
      Dep.target = targetStack[targetStack.length - 1]
    }
    当上面跑完，即 watcher.evaluate() 执行完了，内部又跑了 popTarget 并 this.dirty = false
    此时 targetStack为 [渲染wathcer]
    当跑到下面  watcher.depend() 时 Dep.target = 渲染wathcer
    即把 渲染 watcher 加入到当前收集到的所有dep中, 此时为list 的dep (因为count内部只依赖一个list数组)
    此时 list 的dep上收集的watcher为 [computed Watcher, 渲染 watcher]

    当computed get 方法中依赖的数据发生变更时，触发组件渲染watcher
    其内部 render 就会调用 this.count 进而再次执行 computedGetter 获取computed计算值

    render(h) {
      h('div', this.count)
    }
   */
  return function computedGetter () {
    // 通过key 获取匹配的 watcher
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      // dirty： 如果 watcher 是一个 懒处理的 computed、 computed 自带 lazy: true
      // watcher 内部初始化时  this.dirty = this.lazy // for lazy watchers
      if (watcher.dirty) {
      /*
        evaluate () {
          // 此时this.get 内部 会调用getter 即 computed 的get 方法
          // 并且 watcher 内部的get 方法调用时 会 pushTarget(this)
          // 所以调了这一次后，触发了computed get 内部的
          // defineReactive依赖收集 (new Watcher时由于是dirty 所以不会自己调get)
          // computed get方法中包含有 this.xxx 调用了data | vuex 的响应式数据

          this.value = this.get()
          this.dirty = false
        }
      */
        watcher.evaluate()
      }

      // 把渲染watcher 添加到computed get 方法中依赖的属性的订阅里面去，这很关键
      if (Dep.target) {
      /*
        则收集 watcher
        depend () {
          let i = this.deps.length
          while (i--) {
            // 给每一个 computed get 方法中依赖的属性dep 添加组件渲染watcher
            this.deps[i].depend()
          }
        }
        */
        watcher.depend()
      }
      // 返回从 wathcer 中执行 get 获取到的值
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
