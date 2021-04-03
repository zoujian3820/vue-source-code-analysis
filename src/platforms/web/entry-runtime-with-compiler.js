/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
// 重新封装$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 返回一个实际dom节点元素
  // 如果el不是string 则当成dom直接反回
  // 是string则去querySelector(el) 并反回找到的dom元素
  // 找不到元素则直接 document.createElement('div') 创建一个元素反回
  el = el && query(el)

  /* istanbul ignore if */
  // 如果el是body元素
  // 或者是当前html根节点
  // 则直接中断，并返回Vue当前实例
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 获取new Vue({})时传过来的参数配置 options
  const options = this.$options
  // resolve template/el and convert to render function

  // 如果options中没有render函数
  // 则通过以下处理将template模版解析成render函数 options.render = 生成的render
  // options是对象，由于引用类型的原故，其他地方使用vm.$options.render获取到的将是最新的render
  // 如果有使用了render函数则直接 mount.call(this, el, hydrating)
  // 调用封装前的$mount做后续处理
  if (!options.render) {
    let template = options.template
    // 有使用template模版
    if (template) {
      // 并且template是一个字符串
      if (typeof template === 'string') {
        // 并且是个以 # 号开头的字符串  即传过来的template是一个 id 选择器
        if (template.charAt(0) === '#') {
          // 则获取当前id节点的所有子节点当模版反回
          // 并赋值给template变量
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果template有nodeType， 即是一个元素节点
        // 则获取当前节点的所有子节点当模版反回
        // 并赋值给template变量
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 如果template啥也不是,则直接返回当前Vue实例，并中断执行
        return this
      }
    } else if (el) {
      // 如果没使用template模版, 则获取当前el的所有子节点当模版反回
      // 并赋值给template变量
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)

      // 如果template有值 则把它解析成render函数并赋值给options.render
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
