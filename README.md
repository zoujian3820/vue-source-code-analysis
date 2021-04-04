<p align="center"><a href="https://vuejs.org" target="_blank" rel="noopener noreferrer"><img width="100" src="https://vuejs.org/images/logo.png" alt="Vue logo"></a></p>

<p align="center">
  <a href="https://circleci.com/gh/vuejs/vue/tree/dev"><img src="https://img.shields.io/circleci/project/github/vuejs/vue/dev.svg?sanitize=true" alt="Build Status"></a>
  <a href="https://codecov.io/github/vuejs/vue?branch=dev"><img src="https://img.shields.io/codecov/c/github/vuejs/vue/dev.svg?sanitize=true" alt="Coverage Status"></a>
  <a href="https://npmcharts.com/compare/vue?minimal=true"><img src="https://img.shields.io/npm/dm/vue.svg?sanitize=true" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/vue"><img src="https://img.shields.io/npm/v/vue.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/vue"><img src="https://img.shields.io/npm/l/vue.svg?sanitize=true" alt="License"></a>
  <a href="https://chat.vuejs.org/"><img src="https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true" alt="Chat"></a>
</p>

### Vue v2.6.12 源代码解析
  - 代码逐行中文注释
  - 解析的是npm run dev 生成的版本
  - 通过运行项目并加断点的形式，单步调试
  - examples 中新建了test文件夹 内部是测试的用例代码
  - 如需了解哪个模块，可在其中做相应调用处理，然后断点调试



## 代码结构

- 入口src\platforms\web\entry-runtime-with-compiler.js

  - 重新封装$mount（作用：将template编绎成render）

    - **内部判断并获取template将其转换成render函数**
      - 其中compileToFunctions方法调用了parse方法再调用parseHTML解析html生成AST树
      - 再执行封装前的mount函数

  - 给Vue添加一个静态的compile编绎器方法
    ```javascript
    // 给Vue添加一个静态的compile编绎器方法
    Vue.compile = compileToFunctions
    ```

- src\platforms\web\runtime\index.js

  - 注册全局指令model show与组件Transition TransitionGroup
      ```javascript
      // 添加全局指令 model  show
      extend(Vue.options.directives, platformDirectives)
      // 添加全局组件 Transition  TransitionGroup
      extend(Vue.options.components, platformComponents)
      ```

  - 在原型上添加了patch函数，并区分平台
      ```javascript
      // install platform patch function
      // 在原型上添加了patch(补丁)函数，并区分平台
      // 用来做初始化和更新的
      Vue.prototype.__patch__ = inBrowser ? patch : noop
      ```

  - 原型上再次添加了$mount函数, 实现$mount 初始化挂载
      ```javascript
      // public mount method
      Vue.prototype.$mount = function (
      	el?: string | Element,
      	hydrating?: boolean
      ): Component {
          el = el && inBrowser ? query(el) : undefined
          return mountComponent(this, el, hydrating)
      }
  
      $mount('#app') => mountComponent => render() => vdom => patch() => 真实dom
      ```

- src\core\index.js

    ```javascript
    import Vue from './instance/index'
    import { initGlobalAPI } from './global-api/index'
    //初始化全局api
    initGlobalAPI(Vue)
    ```

    - src\core\global-api\index.js

      - 初始化全局api

          ```javascript
          Vue.util = {
            warn,
            extend,
            mergeOptions,
            defineReactive
          };
          Vue.set = set;
          Vue.delete = del;
          Vue.nextTick = nextTick;
          Vue.options = Object.create(null);
          // 添加KeepAlive全局组件
          // builtInComponents: {KeepAlive}
          extend(Vue.options.components, builtInComponents);
          
          // 初始化Vue.use方法
          // Vue的相同插件多次引用只会执行一次绑定操作, 因为插件会被this._installedPlugins缓存起来
          initUse(Vue);
          // 初始化Vue.mixin方法
          initMixin(Vue);
          // 初始化Vue.extend方法
          // extend使用的是Vue的构造器方法，可生成Vue子类
          
          // Vue.extend + $mount 可实现全局的组件挂载到body中
          /*
            import Vue from 'vue'
          
            const extComponent = Vue.extend({
              template: '<div>{{ text }}</div>',
              data: function () {
                return {
                  text: 'extend test'
                }
              }
            })
          
            const extendComponent = new extComponent().$mount()
           这时候，我们就将组件渲染挂载到 body 节点上了。
           我们可以通过 extendComponent 组件实例的$el 属性，访问实例元素节点
           并加到body后面
          
            document.body.appendChild(extendComponent.$el)
          
          
            $mount()传空则不会发生节点挂载，
            只会编绎模版成render转为Vnode，发生数据渲染而不发生ui渲染
            所以我们可以手动去append到body中
          */
          initExtend(Vue);
          initAssetRegisters(Vue);
          ```
      
    - vue\src\core\instance\index.js

      - Vue的构造函数及声明实例的属性和方法
        ```javascript
        // 构造函数 new Vue(options)
        function Vue (options) {
          if (process.env.NODE_ENV !== 'production' &&
            !(this instanceof Vue)
          ) {
            warn('Vue is a constructor and should be called with the `new` keyword')
          }
          // 初始化
          this._init(options)
          /*
          _init方法包括以下操作
          
          面试题： new Vue发生了哪些事
            1. 做了用户配置选项和系统配置选项的合并
            2. 实例相关的属性进了初始化 如: $parent $root $children $refs
            3. 监听自己的自定义事件
            4. 解析自己的插槽
            5. 同时会把自己内部的一些数据进行响应式的处理 如: props(属性) methosds(方法) data computed watch

          面试题： 为什么new Vue({el: '#app'})时设置了 el 不用调用$mount
          
          if (vm.$options.el) {
            vm.$mount(vm.$options.el)
          }
          
          */
        }
        
        // 初始化实例方法mixin
        // _init方法就在其中
        initMixin(Vue)
        // 我们熟悉的其他实例属性和方法由下面这些混入
        stateMixin(Vue)
        eventsMixin(Vue)
        lifecycleMixin(Vue)
        renderMixin(Vue)
        ```
      
    - src\core\instance\lifecycle.js

      -  mountComponent方法 会创建一个 updateComponents 组件更新方法  
      - 然后 new Watcher()的时候传入了 updateComponents 其内部会调用该方法
      - 然后 updateComponents 方法内部会调用 render() 渲染方法生成 Vnode
      - 并传参给 update() 更新方法 其内部会调用 patch()函数 变成真实dom
      
      ```javascript
      export function mountComponent (
        vm: Component,
        el: ?Element,
        hydrating?: boolean
      ): Component {
        vm.$el = el
        if (!vm.$options.render) {
          vm.$options.render = createEmptyVNode
          if (process.env.NODE_ENV !== 'production') {
             // 无关的删除....
          }
        }
        // 调用将要挂载节点前的生命周期函数
        callHook(vm, 'beforeMount')
      
        let updateComponent
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
            // 无关的删除....
        } else {
          // 定义了组件更新的函数 updateComponent
          // 此刻不会执行
          updateComponent = () => {
            // _update 更新函数
            // _render 渲染函数 生成 Vnode虚拟dom
            vm._update(vm._render(), hydrating)
          }
        }
      
        // we set this to vm._watcher inside the watcher's constructor
        // since the watcher's initial patch may call $forceUpdate (e.g. inside child
        // component's mounted hook), which relies on vm._watcher being already defined
      
        // vue1中有调用的属性，一个属性一个watcher
        // 在vue2中一个组件了个watcher 粒度加大为了减少watcher 减少cpu性能消耗
        // Watcher内部会调用 updateComponent 组件更新函数
        new Watcher(vm, updateComponent, noop, {
          before () {
            if (vm._isMounted && !vm._isDestroyed) {
              callHook(vm, 'beforeUpdate')
            }
          }
        }, true /* isRenderWatcher */)
        hydrating = false
      
        // manually mounted instance, call mounted on self
        // mounted is called for render-created child components in its inserted hook
        if (vm.$vnode == null) {
          vm._isMounted = true
      
          // 调用节点挂载完成生命周期函数
          callHook(vm, 'mounted')
        }
        return vm
      }
      ```
      
    - mountComponent  方法  -> new Watcher()    初始组件依赖收集

      - Watcher 中初始化调用了get函数
        
        - get ->  pushTarget(this)  ->   Dep.target = target (当前watcher)
        
          ```javascript
          // pushTarget(this)
          export function pushTarget (target: ?Watcher) {
            targetStack.push(target)
            Dep.target = target
          }
          ```
        
          
        
        - 然后get函数中会调用updateComponent 方法，其中又调用了render方法创建Vnode
        
        - 而$createElement函数调用时，有使用到响应式数据
        
          ```javascript
          render(h) {
            return h("a", { attrs: { href: `#${this.to}` } }, this.$slots.default);
              
          }
          ```
        
          所以立即触发了下面defineReactive 函数中 Object.defineProperty的 get方法执行 dep.depend()
        
          成功收集依赖 mountComponent  中的 new Watcher() 的实例 
        
          ```javascript
          if (Dep.target) {
                  // 依赖收集 Vue2中一个组件一个Watcher
                  // dep n:1 watcher
                  // 如果用户手动创建 watcher 比如 watch选 this.$watch(key, cb)
                  // dep 1:n watcher
                  dep.depend()
                  if (childOb) {
                    // 如果有子ob，子ob也要做依赖收集
                    childOb.dep.depend()
                    if (Array.isArray(value)) {
                      dependArray(value)
                    }
                  }
                }
          ```
        
          
        
      - new Vue时 _init方法 -> initState(vm) 数据响应初始化
      
        - 递归的响应式处理 observe(data, true)
      
          -  初始创建一次 new Observer(value)
      
          - this.walk(value)  ->  defineReactive
          
            ```javascript
            // defineReactive函数
            const dep = new Dep()
            Object.defineProperty(obj, key, {
              enumerable: true,
              configurable: true,
              get: function reactiveGetter () {
                const value = getter ? getter.call(obj) : val
                if (Dep.target) {
                  // 依赖收集 Vue2中一个组件一个Watcher
                  // dep n:1 watcher
                  // 如果用户手动创建 watcher 比如 watch选 this.$watch(key, cb)
                  // dep 1:n watcher
                  dep.depend()
                  if (childOb) {
                    // 如果有子ob，子ob也要做依赖收集
                    childOb.dep.depend()
                    if (Array.isArray(value)) {
                      dependArray(value)
                    }
                  }
                }
                return value
              },
              set: function reactiveSetter (newVal) {
                const value = getter ? getter.call(obj) : val
                /* eslint-disable no-self-compare */
                if (newVal === value || (newVal !== newVal && value !== value)) {
                  return
                }
                /* eslint-enable no-self-compare */
                if (process.env.NODE_ENV !== 'production' && customSetter) {
                  customSetter()
                }
                // #7981: for accessor properties without setter
                if (getter && !setter) return
                if (setter) {
                  setter.call(obj, newVal)
                } else {
                  val = newVal
                }
                childOb = !shallow && observe(newVal)
                dep.notify()
              }
            })
            ```
              
    
    