/* @flow */

import config from "../config";
import { initUse } from "./use";
import { initMixin } from "./mixin";
import { initExtend } from "./extend";
import { initAssetRegisters } from "./assets";
import { set, del } from "../observer/index";
import { ASSET_TYPES } from "shared/constants";
import builtInComponents from "../components/index";
import { observe } from "core/observer/index";

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive,
} from "../util/index";
import KeepAlive from "../components/keep-alive";

export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {};
  configDef.get = () => config;
  if (process.env.NODE_ENV !== "production") {
    configDef.set = () => {
      warn(
        "Do not replace the Vue.config object, set individual fields instead."
      );
    };
  }
  Object.defineProperty(Vue, "config", configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive,
  };

  Vue.set = set;
  Vue.delete = del;
  Vue.nextTick = nextTick;

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj);
    return obj;
  };

  Vue.options = Object.create(null);
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + "s"] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue;

  // 添加KeepAlive全局组件
  extend(Vue.options.components, builtInComponents);

  // 初始化Vue.use方法
  initUse(Vue);
  // 初始化Vue.mixin方法
  initMixin(Vue);
  //  初始化Vue.extend方法
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
}
