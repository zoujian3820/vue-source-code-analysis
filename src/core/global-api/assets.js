/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // ASSET_TYPES: ['component', 'directive', 'filter']
  ASSET_TYPES.forEach(type => {
    // Vue.component('comp', {...})
    Vue[type] = function (
      id: string, // 如组件，id就是组件名称
      definition: Function | Object // 配置项 可能是函数 或 对象
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // export function isPlainObject (obj: any): boolean {
        //   return _toString.call(obj) === '[object Object]'
        // }
        // 是一个组件，并且是纯对象
        if (type === 'component' && isPlainObject(definition)) {
          // 如何定义一个组件
          definition.name = definition.name || id // 如果定义了name就用name
          // 转换参数2为组件构造器： Vue.extend(options) => VueComponent
          // 获取组件实例：new VueComponent
          // 执行挂载 =》 render() => update => patch()
          // parent create
          //    child  create
          //    child  mount
          // parent mount

          // 获取Vue的构造函数 extend
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 注册到默认的选项中
        // options.components.comp = Ctor
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
