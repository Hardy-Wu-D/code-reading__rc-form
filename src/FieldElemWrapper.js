/*
 * @Author: 吴泓镝 Hardy
 * @Date: 2021-09-03 11:32:40
 * @LastEditTime: 2022-08-09 18:18:36
 * @LastEditors: 吴泓镝 Hardy
 * @Description: 
 * @FilePath: \codeReading\code-reading__rc-form\src\FieldElemWrapper.js
 */
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Field的装饰增强组件
 * 增加componentDidMount、componentWillUnmount两个声明
 * 用于挂载的时候执行渲染记录操作和卸载的时候执行清理操作
 *
 * @export
 * @class FieldElemWrapper
 * @extends {React.Component}
 */
export default class FieldElemWrapper extends React.Component {

  /**
   * 挂载的时候，设置domFields标记为已经挂载dom
   * 并且尝试恢复之前的状态（如果设置了preserve）
   *
   * @memberof FieldElemWrapper
   */
  componentDidMount() {
    const { name, form } = this.props;
    form.domFields[name] = true;
    form.recoverClearedField(name);
  }

  /**
   * 卸载的时候，获取FieldMeta判断preserve
   * 如果为true则缓存状态进去clearedFieldMetaCache
   * 最后清除FieldStore的状态以及清除domFields标记
   *
   * @memberof FieldElemWrapper
   */
  componentWillUnmount() {
    const { name, form } = this.props;
    const fieldMeta = form.fieldsStore.getFieldMeta(name);
    if (!fieldMeta.preserve) {
      // after destroy, delete data
      form.clearedFieldMetaCache[name] = {
        field: form.fieldsStore.getField(name),
        meta: fieldMeta,
      };
      form.clearField(name);
    }
    delete form.domFields[name];
  }

  render() {
    return this.props.children;
  }
}

FieldElemWrapper.propTypes = {
  name: PropTypes.string,
  form: PropTypes.shape({
    domFields: PropTypes.objectOf(PropTypes.bool),
    recoverClearedField: PropTypes.func,
    fieldsStore: PropTypes.shape({
      getFieldMeta: PropTypes.func,
      getField: PropTypes.func,
    }),
    clearedFieldMetaCache: PropTypes.objectOf(
      PropTypes.shape({
        field: PropTypes.object,
        meta: PropTypes.object,
      }),
    ),
    clearField: PropTypes.func,
  }),
  children: PropTypes.node,
};
