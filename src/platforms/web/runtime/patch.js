/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'

// 原生dom相关的操作在这里面
// 比如events 原生事件绑定就在其中的 events文件
// 自定义的事件在Vue _init方法中 -> initEvents 初始化
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 执行 createPatchFunction 函数
// 反回内部的闭包函数 patch
// return function patch (oldVnode, vnode, hydrating, removeOnly) {
export const patch: Function = createPatchFunction({ nodeOps, modules })
