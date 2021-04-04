/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

// 遍历执行  并清空当前微任务 需执行的任务队列操作
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  // length赋值0 === 清空 callbacks 数组
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */

// 如果 promise 不是未定义 且是浏览器 原生方法
// 即当前浏览器环境支持 promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  // 赋值 timerFunc 方法
  timerFunc = () => {
    // 则使用promise的then方法创建一个微任务
    // 并把需要执行的方法当回调传入
    // 这样保证了执行的方法会在微任务执行时，才做处理
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // 如果不支持promise方法， 并且支持 MutationObserver
  // 则降级使用 MutationObserver 方法

  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1

  // 使用 MutationObserver 并把需要执行的方法当回调传入
  const observer = new MutationObserver(flushCallbacks)
  // 新建一个文本节点
  const textNode = document.createTextNode(String(counter))
  // MutationObserver 能监听dom的属性变化
  // 并做响应处理
  // 此处监听 characterData 属性
  observer.observe(textNode, {
    characterData: true
  })

  // 赋值 timerFunc 方法
  timerFunc = () => {
    counter = (counter + 1) % 2
    // 改变data触发 characterData 属性变化
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.

  // 如果以两种都不支持,并且是微软的IE
  // 则使用IE独有的 setImmediate 方法
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.

  // 如果以上三种都不支持，则使用setTimeout
  // 使用宏任务代替处理
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {

  /*

  function timerFunc(){
     var callbacks = [
       ()=>{
         // 执行组件的watcher 队列处理函数 flushSchedulerQueue
       },
       ()=>{},
       ()=>{}， ...
     ]

   function flushCallbacks () {
      pending = false
      const copies = callbacks.slice(0)
      callbacks.length = 0
      for (let i = 0; i < copies.length; i++) {
        copies[i]()
      }
    }
    // 创建了微任务，并把flushCallbacks 当回调函数
    Promise.resolve().then(flushCallbacks)
  }

  var 微任务队列 = []
  var 微任务1 = timerFunc() // 创建一个微任务

  浏览器自动执行
    微任务队列.push(微任务1)

  * */


  let _resolve
  // callbacks 存放当前微任务需执行的 异步任务队列数组
  // 加入到当前微任务 需执行的任务队列中
  callbacks.push(() => {
    // cb (flushSchedulerQueue) 存在则执行
    if (cb) {
      // 处理可能发生的错误
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 如果此时不是在执行微任务清空操作的状态
  if (!pending) {
    pending = true
    // 则立即 创建一个微任务，执行的内容为 flushCallbacks  清空callbacks队列
    // 微任务会加入到浏览器微任务的队列中 微任务会在当前宏任务结束前统一清空处理
    timerFunc()
  }
  // $flow-disable-line
  // 兼容处理，如果上面的cb函数不存在
  // 并且支持promise 则创建一个promise
  // 并赋值_resolve = 当前 promise 的 resolve
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
