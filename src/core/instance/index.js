import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

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
  面试题： new Vue发生了哪些事
    1. 做了用户配置选项和系统配置选项的合并
    2. 实例相关的属性进了初始化 如: $parent $root $children $refs
    3. 监听自己的自定义事件
    4. 解析自己的插槽
    5. 同时会把自己内部的一些数据进行响应式的处理 如: props(属性) methosds(方法) data computed watch
  */
}

// 以下初始化所有实例方法

// _init方法就在其中
initMixin(Vue)
// 我们熟悉的其他实例属性和方法由下面这些混入
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
