/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 执行 createPatchFunction 函数
// 反回内部的闭包函数 patch
// return function patch (oldVnode, vnode, hydrating, removeOnly) {
export const patch: Function = createPatchFunction({ nodeOps, modules })
