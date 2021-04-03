/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 合并mixin所有方法和属性到Vue的options上
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
