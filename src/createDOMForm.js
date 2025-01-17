import ReactDOM from 'react-dom';
import scrollIntoView from 'dom-scroll-into-view';
import has from 'lodash/has';
import createBaseForm from './createBaseForm';
import { mixin as formMixin } from './createForm';
import { getParams } from './utils';

/**
 * 获取元素的计算属性
 * 处理兼容问题以及转化属性prop的名称大小写
 *
 * @param {*} el
 * @param {*} prop
 * @return {*} 
 */
function computedStyle(el, prop) {
  const getComputedStyle = window.getComputedStyle;
  const style =
    // If we have getComputedStyle
    getComputedStyle ?
      // Query it
      // TODO: From CSS-Query notes, we might need (node, null) for FF
      getComputedStyle(el) :

      // Otherwise, we are in IE and use currentStyle
      el.currentStyle;
  if (style) {
    return style
      [
      // Switch to camelCase for CSSOM
      // DEV: Grabbed from jQuery
      // https://github.com/jquery/jquery/blob/1.9-stable/src/css.js#L191-L194
      // https://github.com/jquery/jquery/blob/1.9-stable/src/core.js#L593-L597
        prop.replace(/-(\w)/gi, (word, letter) => {
          return letter.toUpperCase();
        })
      ];
  }
  return undefined;
}

/**
 * 获取最近的具有垂直滚动条的父节点
 * 判断依据：(overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight
 *
 * @param {*} n
 * @return {*} 
 */
function getScrollableContainer(n) {
  let node = n;
  let nodeName;
  /* eslint no-cond-assign:0 */
  while ((nodeName = node.nodeName.toLowerCase()) !== 'body') {
    const overflowY = computedStyle(node, 'overflowY');
    // https://stackoverflow.com/a/36900407/3040605
    if (
      node !== n &&
        (overflowY === 'auto' || overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentNode;
  }
  return nodeName === 'body' ? node.ownerDocument : node;
}

const mixin = {
  getForm() {
    return {
      ...formMixin.getForm.call(this),
      validateFieldsAndScroll: this.validateFieldsAndScroll,
    };
  },
  /**
   * 判断对象obj是否为空对象
   *
   * @export
   * @param {*} obj
   * @return {*} 
   */
  validateFieldsAndScroll(ns, opt, cb) {
    const { names, callback, options } = getParams(ns, opt, cb);
    // 增强callback传递给validateFields（判断和获取最前的FieldDom节点并且scrollIntoView）
    const newCb = (error, values) => {
      if (error) {
        const validNames = this.fieldsStore.getValidFieldsName();
        let firstNode;
        let firstTop;

        validNames.forEach((name) => {
          if (has(error, name)) {
            const instance = this.getFieldInstance(name);
            if (instance) {
              const node = ReactDOM.findDOMNode(instance);
              const top = node.getBoundingClientRect().top;
              if (node.type !== 'hidden' && (firstTop === undefined || firstTop > top)) {
                firstTop = top;
                firstNode = node;
              }
            }
          }
        });

        if (firstNode) {
          const c = options.container || getScrollableContainer(firstNode);
          scrollIntoView(firstNode, c, {
            onlyScrollIfNeeded: true,
            ...options.scroll,
          });
        }
      }

      if (typeof callback === 'function') {
        callback(error, values);
      }
    };

    return this.validateFields(names, options, newCb);
  },
};

/**
 * 创建包含validateFieldsAndScroll方法的Form
 *
 * @param {*} option
 * @return {*} 
 */
function createDOMForm(option) {
  return createBaseForm({
    ...option,
  }, [mixin]);
}

export default createDOMForm;
