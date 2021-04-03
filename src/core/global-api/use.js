/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 定义installedPlugins变量，收集所有引用过的插件
    // 并定义了一个私有变量__installedPlugins 把值赋给installedPlugins
    // Vue第一次使用插件则初始化一个空数组赋值，因引用类型数据，
    // 后面的push操作将会更新到_installedPlugins缓存起来
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果这个插件引用过，则中断操作
    // 所以Vue的相同插件多次引用只会执行一次绑定操作
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 将arguments类数组转成真正的数组
    // 并去除掉第一个参数
    const args = toArray(arguments, 1)
    // 把当前Vue实例this加到args数组的第一个位置
    // 即把this当成插件方法的第一个参数

    /**
     * Vue.use({
     *   install(vm, ...){
     *    console.log(vm === Vue实例)
     *   }
     *  })
     */

    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
