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
      // 在原型上添加了patch函数，并区分平台
      Vue.prototype.__patch__ = inBrowser ? patch : noop
      ```

  - 原型上再次添加了$mount函数
      ```javascript
      // public mount method
      Vue.prototype.$mount = function (
      	el?: string | Element,
      	hydrating?: boolean
      ): Component {
          el = el && inBrowser ? query(el) : undefined
          return mountComponent(this, el, hydrating)
      }
      ```
	
- src\core\index.js

    ```javascript
    import Vue from './instance/index'
    import { initGlobalAPI } from './global-api/index'
    //初始化一些全局api 和 一些静态方法
    initGlobalAPI(Vue)
    ```
    
    - src\core\global-api\index.js
    
      - 初始化一些全局api 和 一些静态方法
    
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

