import hoistStatics from 'hoist-non-react-statics';
import warning from 'warning';
import { isMemo } from 'react-is';

/**
 * 获取被包装装饰的组件的展示名字
 *
 * @param {*} WrappedComponent
 * @return {*} 
 */
function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'WrappedComponent';
}

export function argumentContainer(Container, WrappedComponent) {
  /* eslint no-param-reassign:0 */
  Container.displayName = `Form(${getDisplayName(WrappedComponent)})`;
  Container.WrappedComponent = WrappedComponent;
  return hoistStatics(Container, WrappedComponent);
}

/**
 * 恒等式函数，
 * 用于当作某些类型的回调的默认函数
 *
 * @export
 * @param {*} obj
 * @return {*} 
 */
export function identity(obj) {
  return obj;
}

/**
 * 打平（复制）数组arr
 *
 * @export
 * @param {*} arr
 * @return {*} 
 */
export function flattenArray(arr) {
  return Array.prototype.concat.apply([], arr);
}


/**
 * 对对象tree进行树形结构穿梭，
 * 将对象的key/value和数组的相当做节点分支，将所有叶子节点打平成为pathName/value的形式，
 *
 * @export
 * @param {string} [path='']
 * @param {*} tree
 * @param {*} isLeafNode 判断是否为叶子节点的函数
 * @param {*} errorMessage 错误信息
 * @param {*} callback 对所有叶子节点执行操作的回调函数
 * @return {*} 
 */
export function treeTraverse(path = '', tree, isLeafNode, errorMessage, callback) {
  if (isLeafNode(path, tree)) {
    callback(path, tree);
  } else if (tree === undefined || tree === null) {
    // Do nothing
  } else if (Array.isArray(tree)) {
    tree.forEach((subTree, index) => treeTraverse(
      `${path}[${index}]`,
      subTree,
      isLeafNode,
      errorMessage,
      callback
    ));
  } else { // It's object and not a leaf node
    if (typeof tree !== 'object') {
      warning(false, errorMessage);
      return;
    }
    Object.keys(tree).forEach(subTreeKey => {
      const subTree = tree[subTreeKey];
      treeTraverse(
        `${path}${path ? '.' : ''}${subTreeKey}`,
        subTree,
        isLeafNode,
        errorMessage,
        callback
      );
    });
  }
}

/**
 * 将字段对象打平成字段集合，并且返回字段集合
 *
 * @export
 * @param {*} maybeNestedFields
 * @param {*} isLeafNode
 * @param {*} errorMessage
 * @return {*} 
 */
export function flattenFields(maybeNestedFields, isLeafNode, errorMessage) {
  const fields = {};
  treeTraverse(undefined, maybeNestedFields, isLeafNode, errorMessage, (path, node) => {
    fields[path] = node;
  });
  return fields;
}

/**
 * 整合传入的{ validate, rules, validateTrigger }参数，
 * 整理成规范的验证规则格式[{ trigger: ['onBlur'], rules: [{ required: true, message: '' }] }]
 *
 * @export
 * @param {*} validate
 * @param {*} rules
 * @param {*} validateTrigger
 * @return {*} 
 */
export function normalizeValidateRules(validate, rules, validateTrigger) {
  const validateRules = validate.map((item) => {
    const newItem = {
      ...item,
      trigger: item.trigger || [],
    };
    if (typeof newItem.trigger === 'string') {
      newItem.trigger = [newItem.trigger];
    }
    return newItem;
  });
  if (rules) {
    validateRules.push({
      trigger: validateTrigger ? [].concat(validateTrigger) : [],
      rules,
    });
  }
  return validateRules;
}

/**
 * 整理和获取验证规则validateRules中的触发方式tregger列表
 * { validate: [{ trigger: 'onBlur', rules: [{ required: true }] }] }
 *
 * @export
 * @param {*} validateRules
 * @return {*} 
 */
export function getValidateTriggers(validateRules) {
  return validateRules
    .filter(item => !!item.rules && item.rules.length)
    .map(item => item.trigger)
    .reduce((pre, curr) => pre.concat(curr), []);
}


/**
 * 从事件对象e中获取值value，
 * 默认函数可以外部传进来自定义
 *
 * @export
 * @param {*} e
 * @return {*} 
 */
export function getValueFromEvent(e) {
  // To support custom element
  if (!e || !e.target) {
    return e;
  }
  const { target } = e;
  return target.type === 'checkbox' ? target.checked : target.value;
}

export function getErrorStrs(errors) {
  if (errors) {
    return errors.map((e) => {
      if (e && e.message) {
        return e.message;
      }
      return e;
    });
  }
  return errors;
}

export function getParams(ns, opt, cb) {
  let names = ns;
  let options = opt;
  let callback = cb;
  if (cb === undefined) {
    if (typeof names === 'function') {
      callback = names;
      options = {};
      names = undefined;
    } else if (Array.isArray(names)) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      } else {
        options = options || {};
      }
    } else {
      callback = options;
      options = names || {};
      names = undefined;
    }
  }
  return {
    names,
    options,
    callback,
  };
}


/**
 * 判断对象obj是否为空对象
 *
 * @export
 * @param {*} obj
 * @return {*} 
 */
export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}


/**
 * 判断参数validate是否包含验证规则，
 * { validate: [{ trigger: 'onBlur', rules: [{ required: true }] }] }
 *
 * @export
 * @param {*} validate
 * @return {*} 
 */
export function hasRules(validate) {
  if (validate) {
    return validate.some((item) => {
      return item.rules && item.rules.length;
    });
  }
  return false;
}


/**
 * 判断字符串str是否以字符串prefix前置开头
 *
 * @export
 * @param {*} str
 * @param {*} prefix
 * @return {*} 
 */
export function startsWith(str, prefix) {
  return str.lastIndexOf(prefix, 0) === 0;
}


/**
 * 判断组件nodeOrComponents是否支持ref用法
 *
 * @export
 * @param {*} nodeOrComponent
 * @return {*} 
 */
export function supportRef(nodeOrComponent) {
  const type = isMemo(nodeOrComponent)
    ? nodeOrComponent.type.type
    : nodeOrComponent.type;

  // Function component node
  if (typeof type === 'function' && !(type.prototype && type.prototype.render)) {
    return false;
  }

  // Class component
  if (
    typeof nodeOrComponent === 'function' &&
    !(nodeOrComponent.prototype && nodeOrComponent.prototype.render)
  ) {
    return false;
  }

  return true;
}
