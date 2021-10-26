/* eslint-disable react/prefer-es6-class */
/* eslint-disable prefer-promise-reject-errors */

import React from 'react';
import createReactClass from 'create-react-class';
import unsafeLifecyclesPolyfill from 'rc-util/lib/unsafeLifecyclesPolyfill';
import AsyncValidator from 'async-validator';
import warning from 'warning';
import get from 'lodash/get';
import set from 'lodash/set';
import eq from 'lodash/eq';
import createFieldsStore from './createFieldsStore';
import {
  argumentContainer,
  identity,
  normalizeValidateRules,
  getValidateTriggers,
  getValueFromEvent,
  hasRules,
  getParams,
  isEmptyObject,
  flattenArray,
  supportRef
} from './utils';
import FieldElemWrapper from './FieldElemWrapper';

/** @type {*} 默认的触发器名称是onChange */
const DEFAULT_TRIGGER = 'onChange';

/**
 * 创建基础表单对象
 *
 * @param {*} [option={}] 配置对象
 * @param {*} [mixins=[]] 混合字段对象，混入的是{ getForm: Object }
 * @return {*} 
 */
function createBaseForm(option = {}, mixins = []) {
  const {
    validateMessages,
    onFieldsChange,
    onValuesChange,
    mapProps = identity,
    mapPropsToFields,
    fieldNameProp,
    fieldMetaProp,
    fieldDataProp,
    formPropName = 'form',
    name: formName,
    // @deprecated
    withRef,
  } = option;
  // 装饰方法函数，返回包装了WrappedComponent的高阶组件
  return function decorate(WrappedComponent) {
    // 通过createReactClass创建Form的ReactComponent
    const Form = createReactClass({
      mixins,

      /**
       * 根据组件属性props，调用参数中转换函数mapPropsToFields，获取和设置组件的初始state
       *
       * @return {*} 
       */
      getInitialState() {
        const fields = mapPropsToFields && mapPropsToFields(this.props);
        this.fieldsStore = createFieldsStore(fields || {});

        this.instances = {};
        // 绑定函数的缓存
        // fn: 通过bind绑定this后的新函数
        // oriFn: 绑定前的源函数
        // { fn: function, oriFn: function }
        this.cachedBind = {};
        this.clearedFieldMetaCache = {};

        this.renderFields = {};
        this.domFields = {};

        // HACK: https://github.com/ant-design/ant-design/issues/6406
        [
          'getFieldsValue',
          'getFieldValue',
          'setFieldsInitialValue',
          'getFieldsError',
          'getFieldError',
          'isFieldValidating',
          'isFieldsValidating',
          'isFieldsTouched',
          'isFieldTouched',
        ].forEach(key => {
          this[key] = (...args) => {
            if (process.env.NODE_ENV !== 'production') {
              warning(
                false,
                'you should not use `ref` on enhanced form, please use `wrappedComponentRef`. ' +
                  'See: https://github.com/react-component/form#note-use-wrappedcomponentref-instead-of-withref-after-rc-form140',
              );
            }
            return this.fieldsStore[key](...args);
          };
        });

        return {
          submitting: false,
        };
      },

      /**
       * 组件卸载完成，清除无用的字段
       *
       */
      componentDidMount() {
        this.cleanUpUselessFields();
      },
      
      /**
       * 组件接收新的属性，更新称为filedsStore的fields
       *
       * @param {*} nextProps
       */
      componentWillReceiveProps(nextProps) {
        if (mapPropsToFields) {
          this.fieldsStore.updateFields(mapPropsToFields(nextProps));
        }
      },

      /**
       * 组件更新完成，清除无用的字段
       *
       */
      componentDidUpdate() {
        this.cleanUpUselessFields();
      },

      /**
       * 所有收集类处理函数的公用逻辑
       * 包括：
       *      调用指定字段名称name的字段的方法action（先找filedMeta[action]的调用，没有就找fieldMeta.originalProps[action]的调用）
       *      通过getValueFromEvent从参数中获取新value值
       *      对比新value值和旧value值，调用值变动回调函数onValuesChange
       *      返回{ name: string, field: object, fieldMeta: object }
       *
       * @param {*} name
       * @param {*} action
       * @param {*} args
       * @return {*} 
       */
      onCollectCommon(name, action, args) {
        const fieldMeta = this.fieldsStore.getFieldMeta(name);
        if (fieldMeta[action]) {
          fieldMeta[action](...args);
        } else if (fieldMeta.originalProps && fieldMeta.originalProps[action]) {
          fieldMeta.originalProps[action](...args);
        }
        const value = fieldMeta.getValueFromEvent
          ? fieldMeta.getValueFromEvent(...args)
          : getValueFromEvent(...args);
        if (onValuesChange && value !== this.fieldsStore.getFieldValue(name)) {
          const valuesAll = this.fieldsStore.getAllValues();
          const valuesAllSet = {};
          valuesAll[name] = value;
          Object.keys(valuesAll).forEach(key =>
            set(valuesAllSet, key, valuesAll[key]),
          );
          onValuesChange(
            {
              [formPropName]: this.getForm(),
              ...this.props,
            },
            set({}, name, value),
            valuesAllSet,
          );
        }
        const field = this.fieldsStore.getField(name);
        return { name, field: { ...field, value, touched: true }, fieldMeta };
      },

      /**
       * 指定字段名称的字段的收集处理函数
       *
       * @param {*} name_
       * @param {*} action
       * @param {*} args
       */
      onCollect(name_, action, ...args) {
        const { name, field, fieldMeta } = this.onCollectCommon(
          name_,
          action,
          args,
        );
        const { validate } = fieldMeta;

        this.fieldsStore.setFieldsAsDirty();

        const newField = {
          ...field,
          dirty: hasRules(validate),
        };
        this.setFields({
          [name]: newField,
        });
      },
      
      /**
       * 指定字段名称的字段的验证收集处理函数
       *
       * @param {*} name_
       * @param {*} action
       * @param {*} args
       */
      onCollectValidate(name_, action, ...args) {
        const { field, fieldMeta } = this.onCollectCommon(name_, action, args);
        const newField = {
          ...field,
          dirty: true,
        };

        this.fieldsStore.setFieldsAsDirty();

        this.validateFieldsInternal([newField], {
          action,
          options: {
            firstFields: !!fieldMeta.validateFirst,
          },
        });
      },

      /**
       * 获取对应字段名称的字段的绑定函数action【从cachedBind中获取，如果没有就创建对应绑定函数并且返回】
       *
       * @param {*} name
       * @param {*} action
       * @param {*} fn
       * @return {*} 
       */
      getCacheBind(name, action, fn) {
        if (!this.cachedBind[name]) {
          this.cachedBind[name] = {};
        }
        const cache = this.cachedBind[name];
        if (!cache[action] || cache[action].oriFn !== fn) {
          cache[action] = {
            fn: fn.bind(this, name, action),
            oriFn: fn,
          };
        }
        return cache[action].fn;
      },

      /**
       * 获取表单字段装饰器
       * 清除、注册、获取字段属性
       *
       * @param {*} name
       * @param {*} fieldOption
       * @return {*} 
       */
      getFieldDecorator(name, fieldOption) {
        const props = this.getFieldProps(name, fieldOption);
        return fieldElem => {
          // 设置字段的已渲染状态标记
          // We should put field in record if it is rendered
          this.renderFields[name] = true;

          const fieldMeta = this.fieldsStore.getFieldMeta(name);
          const originalProps = fieldElem.props;
          // 被装饰组件的valuePropName和defaultPropName的属性接管提示
          if (process.env.NODE_ENV !== 'production') {
            const valuePropName = fieldMeta.valuePropName;
            warning(
              !(valuePropName in originalProps),
              `\`getFieldDecorator\` will override \`${valuePropName}\`, ` +
                `so please don't set \`${valuePropName}\` directly ` +
                `and use \`setFieldsValue\` to set it.`,
            );
            const defaultValuePropName = `default${valuePropName[0].toUpperCase()}${valuePropName.slice(
              1,
            )}`;
            warning(
              !(defaultValuePropName in originalProps),
              `\`${defaultValuePropName}\` is invalid ` +
                `for \`getFieldDecorator\` will set \`${valuePropName}\`,` +
                ` please use \`option.initialValue\` instead.`,
            );
          }
          fieldMeta.originalProps = originalProps;
          fieldMeta.ref = fieldElem.ref;
          // 复制被装饰的字段元素，添加新的props进去
          const decoratedFieldElem = React.cloneElement(fieldElem, {
            ...props,
            ...this.fieldsStore.getFieldValuePropValue(fieldMeta),
          });
          return supportRef(fieldElem) ? (
            decoratedFieldElem
          ) : (
            <FieldElemWrapper name={name} form={this}>
              {decoratedFieldElem}
            </FieldElemWrapper>
          );
        };
      },

      /**
       * 获取字段属性
       * 清除、注册、获取字段属性
       *
       * @param {*} name
       * @param {*} [usersFieldOption={}]
       * @return {*} 
       */
      getFieldProps(name, usersFieldOption = {}) {
        if (!name) {
          throw new Error('Must call `getFieldProps` with valid name string!');
        }
        // 可使用嵌套字段名称、和已废除的exclusive的警示信息
        if (process.env.NODE_ENV !== 'production') {
          warning(
            this.fieldsStore.isValidNestedFieldName(name),
            `One field name cannot be part of another, e.g. \`a\` and \`a.b\`. Check field: ${name}`,
          );
          warning(
            !('exclusive' in usersFieldOption),
            '`option.exclusive` of `getFieldProps`|`getFieldDecorator` had been remove.',
          );
        }
        // 移除该字段的已清除元数据缓存的标记
        delete this.clearedFieldMetaCache[name];

        const fieldOption = {
          name,
          trigger: DEFAULT_TRIGGER,
          valuePropName: 'value',
          validate: [],
          ...usersFieldOption,
        };

        const {
          rules,
          trigger,
          validateTrigger = trigger,
          validate,
        } = fieldOption;

        const fieldMeta = this.fieldsStore.getFieldMeta(name);
        if ('initialValue' in fieldOption) {
          fieldMeta.initialValue = fieldOption.initialValue;
        }

        const inputProps = {
          ...this.fieldsStore.getFieldValuePropValue(fieldOption),
          ref: this.getCacheBind(name, `${name}__ref`, this.saveRef),
        };
        if (fieldNameProp) {
          inputProps[fieldNameProp] = formName ? `${formName}_${name}` : name;
        }

        const validateRules = normalizeValidateRules(
          validate,
          rules,
          validateTrigger,
        );
        const validateTriggers = getValidateTriggers(validateRules);
        validateTriggers.forEach(action => {
          if (inputProps[action]) return;
          inputProps[action] = this.getCacheBind(
            name,
            action,
            this.onCollectValidate,
          );
        });

        // make sure that the value will be collect
        if (trigger && validateTriggers.indexOf(trigger) === -1) {
          inputProps[trigger] = this.getCacheBind(
            name,
            trigger,
            this.onCollect,
          );
        }

        const meta = {
          ...fieldMeta,
          ...fieldOption,
          validate: validateRules,
        };
        this.fieldsStore.setFieldMeta(name, meta);
        if (fieldMetaProp) {
          inputProps[fieldMetaProp] = meta;
        }

        if (fieldDataProp) {
          inputProps[fieldDataProp] = this.fieldsStore.getField(name);
        }

        // This field is rendered, record it
        this.renderFields[name] = true;

        return inputProps;
      },

      getFieldInstance(name) {
        return this.instances[name];
      },

      getRules(fieldMeta, action) {
        const actionRules = fieldMeta.validate
          .filter(item => {
            return !action || item.trigger.indexOf(action) >= 0;
          })
          .map(item => item.rules);
        return flattenArray(actionRules);
      },

      setFields(maybeNestedFields, callback) {
        const fields = this.fieldsStore.flattenRegisteredFields(
          maybeNestedFields,
        );
        this.fieldsStore.setFields(fields);
        if (onFieldsChange) {
          const changedFields = Object.keys(fields).reduce(
            (acc, name) => set(acc, name, this.fieldsStore.getField(name)),
            {},
          );
          onFieldsChange(
            {
              [formPropName]: this.getForm(),
              ...this.props,
            },
            changedFields,
            this.fieldsStore.getNestedAllFields(),
          );
        }
        this.forceUpdate(callback);
      },

      setFieldsValue(changedValues, callback) {
        const { fieldsMeta } = this.fieldsStore;
        const values = this.fieldsStore.flattenRegisteredFields(changedValues);
        const newFields = Object.keys(values).reduce((acc, name) => {
          const isRegistered = fieldsMeta[name];
          if (process.env.NODE_ENV !== 'production') {
            warning(
              isRegistered,
              'Cannot use `setFieldsValue` until ' +
                'you use `getFieldDecorator` or `getFieldProps` to register it.',
            );
          }
          if (isRegistered) {
            const value = values[name];
            acc[name] = {
              value,
            };
          }
          return acc;
        }, {});
        this.setFields(newFields, callback);
        if (onValuesChange) {
          const allValues = this.fieldsStore.getAllValues();
          onValuesChange(
            {
              [formPropName]: this.getForm(),
              ...this.props,
            },
            changedValues,
            allValues,
          );
        }
      },

      saveRef(name, _, component) {
        if (!component) {
          const fieldMeta = this.fieldsStore.getFieldMeta(name);
          if (!fieldMeta.preserve) {
            // after destroy, delete data
            this.clearedFieldMetaCache[name] = {
              field: this.fieldsStore.getField(name),
              meta: fieldMeta,
            };
            this.clearField(name);
          }
          delete this.domFields[name];
          return;
        }
        this.domFields[name] = true;
        this.recoverClearedField(name);
        const fieldMeta = this.fieldsStore.getFieldMeta(name);
        if (fieldMeta) {
          const ref = fieldMeta.ref;
          if (ref) {
            if (typeof ref === 'string') {
              throw new Error(`can not set ref string for ${name}`);
            } else if (typeof ref === 'function') {
              ref(component);
            } else if (Object.prototype.hasOwnProperty.call(ref, 'current')) {
              ref.current = component;
            }
          }
        }
        this.instances[name] = component;
      },

      cleanUpUselessFields() {
        const fieldList = this.fieldsStore.getAllFieldsName();
        const removedList = fieldList.filter(field => {
          const fieldMeta = this.fieldsStore.getFieldMeta(field);
          return (
            !this.renderFields[field] &&
            !this.domFields[field] &&
            !fieldMeta.preserve
          );
        });
        if (removedList.length) {
          removedList.forEach(this.clearField);
        }
        this.renderFields = {};
      },

      clearField(name) {
        this.fieldsStore.clearField(name);
        delete this.instances[name];
        delete this.cachedBind[name];
      },

      resetFields(ns) {
        const newFields = this.fieldsStore.resetFields(ns);
        if (Object.keys(newFields).length > 0) {
          this.setFields(newFields);
        }
        if (ns) {
          const names = Array.isArray(ns) ? ns : [ns];
          names.forEach(name => delete this.clearedFieldMetaCache[name]);
        } else {
          this.clearedFieldMetaCache = {};
        }
      },

      recoverClearedField(name) {
        if (this.clearedFieldMetaCache[name]) {
          this.fieldsStore.setFields({
            [name]: this.clearedFieldMetaCache[name].field,
          });
          this.fieldsStore.setFieldMeta(
            name,
            this.clearedFieldMetaCache[name].meta,
          );
          delete this.clearedFieldMetaCache[name];
        }
      },

      validateFieldsInternal(
        fields,
        { fieldNames, action, options = {} },
        callback,
      ) {
        const allRules = {};
        const allValues = {};
        const allFields = {};
        const alreadyErrors = {};
        fields.forEach(field => {
          const name = field.name;
          if (options.force !== true && field.dirty === false) {
            if (field.errors) {
              set(alreadyErrors, name, { errors: field.errors });
            }
            return;
          }
          const fieldMeta = this.fieldsStore.getFieldMeta(name);
          const newField = {
            ...field,
          };
          newField.errors = undefined;
          newField.validating = true;
          newField.dirty = true;
          allRules[name] = this.getRules(fieldMeta, action);
          allValues[name] = newField.value;
          allFields[name] = newField;
        });
        this.setFields(allFields);
        // in case normalize
        Object.keys(allValues).forEach(f => {
          allValues[f] = this.fieldsStore.getFieldValue(f);
        });
        if (callback && isEmptyObject(allFields)) {
          callback(
            isEmptyObject(alreadyErrors) ? null : alreadyErrors,
            this.fieldsStore.getFieldsValue(fieldNames),
          );
          return;
        }
        const validator = new AsyncValidator(allRules);
        if (validateMessages) {
          validator.messages(validateMessages);
        }
        validator.validate(allValues, options, errors => {
          const errorsGroup = {
            ...alreadyErrors,
          };
          if (errors && errors.length) {
            errors.forEach(e => {
              const errorFieldName = e.field;
              let fieldName = errorFieldName;

              // Handle using array validation rule.
              // ref: https://github.com/ant-design/ant-design/issues/14275
              Object.keys(allRules).some(ruleFieldName => {
                const rules = allRules[ruleFieldName] || [];

                // Exist if match rule
                if (ruleFieldName === errorFieldName) {
                  fieldName = ruleFieldName;
                  return true;
                }

                // Skip if not match array type
                if (
                  rules.every(({ type }) => type !== 'array') ||
                  errorFieldName.indexOf(`${ruleFieldName}.`) !== 0
                ) {
                  return false;
                }

                // Exist if match the field name
                const restPath = errorFieldName.slice(ruleFieldName.length + 1);
                if (/^\d+$/.test(restPath)) {
                  fieldName = ruleFieldName;
                  return true;
                }

                return false;
              });

              const field = get(errorsGroup, fieldName);
              if (typeof field !== 'object' || Array.isArray(field)) {
                set(errorsGroup, fieldName, { errors: [] });
              }
              const fieldErrors = get(errorsGroup, fieldName.concat('.errors'));
              fieldErrors.push(e);
            });
          }
          const expired = [];
          const nowAllFields = {};
          Object.keys(allRules).forEach(name => {
            const fieldErrors = get(errorsGroup, name);
            const nowField = this.fieldsStore.getField(name);
            // avoid concurrency problems
            if (!eq(nowField.value, allValues[name])) {
              expired.push({
                name,
              });
            } else {
              nowField.errors = fieldErrors && fieldErrors.errors;
              nowField.value = allValues[name];
              nowField.validating = false;
              nowField.dirty = false;
              nowAllFields[name] = nowField;
            }
          });
          this.setFields(nowAllFields);
          if (callback) {
            if (expired.length) {
              expired.forEach(({ name }) => {
                const fieldErrors = [
                  {
                    message: `${name} need to revalidate`,
                    field: name,
                  },
                ];
                set(errorsGroup, name, {
                  expired: true,
                  errors: fieldErrors,
                });
              });
            }

            callback(
              isEmptyObject(errorsGroup) ? null : errorsGroup,
              this.fieldsStore.getFieldsValue(fieldNames),
            );
          }
        });
      },

      validateFields(ns, opt, cb) {
        const pending = new Promise((resolve, reject) => {
          const { names, options } = getParams(ns, opt, cb);
          let { callback } = getParams(ns, opt, cb);
          if (!callback || typeof callback === 'function') {
            const oldCb = callback;
            callback = (errors, values) => {
              if (oldCb) {
                oldCb(errors, values);
              }
              if (errors) {
                reject({ errors, values });
              } else {
                resolve(values);
              }
            };
          }
          const fieldNames = names
            ? this.fieldsStore.getValidFieldsFullName(names)
            : this.fieldsStore.getValidFieldsName();
          const fields = fieldNames
            .filter(name => {
              const fieldMeta = this.fieldsStore.getFieldMeta(name);
              return hasRules(fieldMeta.validate);
            })
            .map(name => {
              const field = this.fieldsStore.getField(name);
              field.value = this.fieldsStore.getFieldValue(name);
              return field;
            });
          if (!fields.length) {
            callback(null, this.fieldsStore.getFieldsValue(fieldNames));
            return;
          }
          if (!('firstFields' in options)) {
            options.firstFields = fieldNames.filter(name => {
              const fieldMeta = this.fieldsStore.getFieldMeta(name);
              return !!fieldMeta.validateFirst;
            });
          }
          this.validateFieldsInternal(
            fields,
            {
              fieldNames,
              options,
            },
            callback,
          );
        });
        pending.catch(e => {
          // eslint-disable-next-line no-console
          if (console.error && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error(e);
          }
          return e;
        });
        return pending;
      },

      isSubmitting() {
        if (
          process.env.NODE_ENV !== 'production' &&
          process.env.NODE_ENV !== 'test'
        ) {
          warning(
            false,
            '`isSubmitting` is deprecated. ' +
              "Actually, it's more convenient to handle submitting status by yourself.",
          );
        }
        return this.state.submitting;
      },

      submit(callback) {
        if (
          process.env.NODE_ENV !== 'production' &&
          process.env.NODE_ENV !== 'test'
        ) {
          warning(
            false,
            '`submit` is deprecated. ' +
              "Actually, it's more convenient to handle submitting status by yourself.",
          );
        }
        const fn = () => {
          this.setState({
            submitting: false,
          });
        };
        this.setState({
          submitting: true,
        });
        callback(fn);
      },

      render() {
        const { wrappedComponentRef, ...restProps } = this.props; // eslint-disable-line
        const formProps = {
          [formPropName]: this.getForm(),
        };
        if (withRef) {
          if (
            process.env.NODE_ENV !== 'production' &&
            process.env.NODE_ENV !== 'test'
          ) {
            warning(
              false,
              '`withRef` is deprecated, please use `wrappedComponentRef` instead. ' +
                'See: https://github.com/react-component/form#note-use-wrappedcomponentref-instead-of-withref-after-rc-form140',
            );
          }
          formProps.ref = 'wrappedComponent';
        } else if (wrappedComponentRef) {
          formProps.ref = wrappedComponentRef;
        }
        const props = mapProps.call(this, {
          ...formProps,
          ...restProps,
        });
        return <WrappedComponent {...props} />;
      },
    });

    return argumentContainer(unsafeLifecyclesPolyfill(Form), WrappedComponent);
  };
}

export default createBaseForm;
