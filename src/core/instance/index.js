import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import {nextTick, warn} from '../util/index'

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

// 初始化 $data $props $set $delete  $watch 等实例属性及方法
stateMixin(Vue)
// 初始化 $on $once $off  $emit 等实例方法
eventsMixin(Vue)
// 初始化 _update(updateComponent会调用_update)，new Watcher 会把updateComponent当参数传入，并调用
// $forceUpdate（手动强制更新watch）
// $destroy （页面注销 卸载操作） 等实例方法
lifecycleMixin(Vue)
// 初始化
// $nextTick 调用 nextTick 方法
// _render 调用当前实例中的render函数 生成Vnode 并当参数传递给 _update函数
// 等实例方法
renderMixin(Vue)

export default Vue
