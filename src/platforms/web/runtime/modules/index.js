import attrs from './attrs'
import klass from './class'
import events from './events'
import domProps from './dom-props'
import style from './style'
import transition from './transition'

export default [
  attrs,
  klass,
  // events 原生的事件绑定都在这里面
  // 自定义的事件在Vue _init方法中初始化
  events,
  domProps,
  style,
  transition
]
