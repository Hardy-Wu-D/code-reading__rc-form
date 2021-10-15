import set from 'lodash/set';
import createFormField, { isFormField } from './createFormField';
import {
  hasRules,
  flattenFields,
  getErrorStrs,
  startsWith,
} from './utils';


/**
 * 判断pathName a 是否为pathName b的一部分
 *
 * @param {*} a
 * @param {*} b
 * @return {*} 
 */
function partOf(a, b) {
  return b.indexOf(a) === 0 && ['.', '['].indexOf(b[a.length]) !== -1;
}

/**
 * FieldsStore内置的个性化的将字段对象fields打平成字段集的方法
 *
 * @param {*} fields
 * @return {*} 
 */
function internalFlattenFields(fields) {
  return flattenFields(
    fields,
    (_, node) => isFormField(node),
    'You must wrap field data with `createFormField`.'
  );
}

class FieldsStore {

  /**
   * Creates an instance of FieldsStore.
   * 构造函数，初始化字段集fields和字段元数据集fieldsMeta
   * @param {*} fields
   * @memberof FieldsStore
   */
  constructor(fields) {
    this.fields = internalFlattenFields(fields);
    this.fieldsMeta = {};
  }
  
  /**
   * 将字段对象fields来更新字段集【通过internalFlattenFields来打平】
   *
   * @param {*} fields
   * @memberof FieldsStore
   */
  updateFields(fields) {
    this.fields = internalFlattenFields(fields);
  }

  /**
   * 将字段对象fields中的已经注册在FieldStore中的字段打平【在字段元数据集fieldsMeta中就是已经注册的】，并且返回打平的字段集合
   *
   * @param {*} fields
   * @return {*} 
   * @memberof FieldsStore
   */
  flattenRegisteredFields(fields) {
    const validFieldsName = this.getAllFieldsName();
    return flattenFields(
      fields,
      path => validFieldsName.indexOf(path) >= 0,
      'You cannot set a form field before rendering a field associated with the value.'
    );
  }

  /**
   * 更新设置已经注册在FieldStore中的字段初始值【在字段元数据集fieldsMeta中就是已经注册的】
   * 更新fieldsMeta中的字段源数据对象的initialValue
   *
   * @param {*} initialValues
   * @memberof FieldsStore
   */
  setFieldsInitialValue = (initialValues) => {
    const flattenedInitialValues = this.flattenRegisteredFields(initialValues);
    const fieldsMeta = this.fieldsMeta;
    Object.keys(flattenedInitialValues).forEach(name => {
      if (fieldsMeta[name]) {
        this.setFieldMeta(name, {
          ...this.getFieldMeta(name),
          initialValue: flattenedInitialValues[name],
        });
      }
    });
  }

  /**
   * 设置新的字段集值
   * 设置的时候会判断是否定义了字段值的规范方法normalise，如果定义了就会对新的值进行规范化处理
   *
   * @param {*} fields
   * @memberof FieldsStore
   */
  setFields(fields) {
    const fieldsMeta = this.fieldsMeta;
    const nowFields = {
      ...this.fields,
      ...fields,
    };
    const nowValues = {};
    Object.keys(fieldsMeta)
      .forEach((f) => {
        nowValues[f] = this.getValueFromFields(f, nowFields);
      });
    Object.keys(nowValues).forEach((f) => {
      const value = nowValues[f];
      const fieldMeta = this.getFieldMeta(f);
      if (fieldMeta && fieldMeta.normalize) {
        const nowValue =
                fieldMeta.normalize(value, this.getValueFromFields(f, this.fields), nowValues);
        if (nowValue !== value) {
          nowFields[f] = {
            ...nowFields[f],
            value: nowValue,
          };
        }
      }
    });
    this.fields = nowFields;
  }

  /**
   * 重置字段集fields为初始状态
   *
   * @param {*} ns
   * @return {*} 
   * @memberof FieldsStore
   */
  resetFields(ns) {
    const { fields } = this;
    const names = ns ?
      this.getValidFieldsFullName(ns) :
      this.getAllFieldsName();
    return names.reduce((acc, name) => {
      const field = fields[name];
      if (field && 'value' in field) {
        acc[name] = {};
      }
      return acc;
    }, {});
  }

  /**
   * 设置新的字段元数据name的值meta
   *
   * @param {*} name
   * @param {*} meta
   * @memberof FieldsStore
   */
  setFieldMeta(name, meta) {
    this.fieldsMeta[name] = meta;
  }

  // TODO: 设置为脏来干嘛？？？
  /**
   * 设置字段集fields中的字段的dirty属性为true（设置为脏）
   *
   * @memberof FieldsStore
   */
  setFieldsAsDirty() {
    Object.keys(this.fields).forEach((name) => {
      const field = this.fields[name];
      const fieldMeta = this.fieldsMeta[name];
      if (field && fieldMeta && hasRules(fieldMeta.validate)) {
        this.fields[name] = {
          ...field,
          dirty: true,
        };
      }
    });
  }

  /**
   * 根据字段名称获取字段元数据
   * 如果获取的字段元数据不存在则初始化它【初始化为空对象】
   *
   * @param {*} name
   * @return {*} 
   * @memberof FieldsStore
   */
  getFieldMeta(name) {
    this.fieldsMeta[name] = this.fieldsMeta[name] || {};
    return this.fieldsMeta[name];
  }

  /**
   * 获取字段集fields中对应名称name的字段值
   * 如果字段集fields中没有这个值，就从尝试从字段元数据集中获取
   *
   * @param {*} name
   * @param {*} fields
   * @return {*} 
   * @memberof FieldsStore
   */
  getValueFromFields(name, fields) {
    const field = fields[name];
    if (field && 'value' in field) {
      return field.value;
    }
    const fieldMeta = this.getFieldMeta(name);
    return fieldMeta && fieldMeta.initialValue;
  }

  /**
   * 获取所有已经注册在fieldStore中的字段的字段值，并且根据字段path整理成值对象valueObject
   *
   * @memberof FieldsStore
   */
  getAllValues = () => {
    const { fieldsMeta, fields } = this;
    return Object.keys(fieldsMeta)
      .reduce((acc, name) => set(acc, name, this.getValueFromFields(name, fields)), {});
  }

  /**
   * 获取字段集合的所有有效的字段名称列表【fieldsMeta中的字段，并且没有设置hidden属性的】
   *
   * @return {*} 
   * @memberof FieldsStore
   */
  getValidFieldsName() {
    const { fieldsMeta } = this;
    return fieldsMeta ?
      Object.keys(fieldsMeta).filter(name => !this.getFieldMeta(name).hidden) :
      [];
  }

  /**
   * 获取字段集合的所有字段名称列表【fieldsMeta中的所有字段】
   *
   * @return {*} 
   * @memberof FieldsStore
   */
  getAllFieldsName() {
    const { fieldsMeta } = this;
    return fieldsMeta ? Object.keys(fieldsMeta) : [];
  }
  
  /**
   * 获取字段集合中字段命名集合namespace(maybePartialName)下的所有有效的字段名称列表【fieldsMeta中的字段，并且没有设置hidden属性的】
   *
   * @param {*} maybePartialName
   * @return {*} 
   * @memberof FieldsStore
   */
  getValidFieldsFullName(maybePartialName) {
    const maybePartialNames = Array.isArray(maybePartialName) ?
      maybePartialName : [maybePartialName];
    return this.getValidFieldsName()
      .filter(fullName => maybePartialNames.some(partialName => (
        fullName === partialName || (
          startsWith(fullName, partialName) &&
          ['.', '['].indexOf(fullName[partialName.length]) >= 0
        )
      )));
  }

  /**
   * 根据指定字段元数据值，获取字段集中对应字段的value对象值{ value: any, [string]: any }
   * 没有value就用initialValue
   * 如果有getValueProps方法参数，就用调用这个方法获取转化后的方法
   *
   * @param {*} fieldMeta
   * @return {*} 
   * @memberof FieldsStore
   */
  getFieldValuePropValue(fieldMeta) {
    const { name, getValueProps, valuePropName } = fieldMeta;
    const field = this.getField(name);
    const fieldValue = 'value' in field ?
      field.value : fieldMeta.initialValue;
    if (getValueProps) {
      return getValueProps(fieldValue);
    }
    return { [valuePropName]: fieldValue };
  }

  /**
   * 获取指定名称name的字段集的字段，同时把name字段一起放进去
   * 至少返回{ name: string }
   *
   * @param {*} name
   * @return {*} 
   * @memberof FieldsStore
   */
  getField(name) {
    return {
      ...this.fields[name],
      name,
    };
  }

  /**
   * 获取所有已经注册但是尚未收集和更新新的值的字段属性的列表
   * 给这些字段设置为{ name: string, dirty: boolean, value: any }格式的props对象
   *
   * @return {*} 
   * @memberof FieldsStore
   */
  getNotCollectedFields() {
    const fieldsName = this.getValidFieldsName();
    return fieldsName
      .filter(name => !this.fields[name])
      .map(name => ({
        name,
        dirty: false,
        value: this.getFieldMeta(name).initialValue,
      }))
      .reduce((acc, field) => set(acc, field.name, createFormField(field)), {});
  }

  /**
   * 获取所有字段（包括字段集和已经注册但是还没收集更新过的字段）的字段集合嵌套结构对象
   *
   * @return {*} 
   * @memberof FieldsStore
   */
  getNestedAllFields() {
    return Object.keys(this.fields)
      .reduce(
        (acc, name) => set(acc, name, createFormField(this.fields[name])),
        this.getNotCollectedFields()
      );
  }

  /**
   * 获取字段集合fields中对应名称name的字段属性对象的对应成员名称member的值
   *
   * @param {*} name
   * @param {*} member
   * @return {*} 
   * @memberof FieldsStore
   */
  getFieldMember(name, member) {
    return this.getField(name)[member];
  }

  /**
   * 获取对应字段名列表names的字段的字段集合嵌套结构对象
   * 如果没有传递names就获取全部已经注册并且有效的字段名称列表
   * getter方法可以定义获取字段名称的获取方法
   *
   * @param {*} names
   * @param {*} getter
   * @return {*} 
   * @memberof FieldsStore
   */
  getNestedFields(names, getter) {
    const fields = names || this.getValidFieldsName();
    return fields.reduce((acc, f) => set(acc, f, getter(f)), {});
  }

  /**
   * 
   *
   * @param {*} name
   * @param {*} getter
   * @return {*} 
   * @memberof FieldsStore
   */
  getNestedField(name, getter) {
    const fullNames = this.getValidFieldsFullName(name);
    if (
      fullNames.length === 0 || // Not registered
        (fullNames.length === 1 && fullNames[0] === name) // Name already is full name.
    ) {
      return getter(name);
    }
    const isArrayValue = fullNames[0][name.length] === '[';
    const suffixNameStartIndex = isArrayValue ? name.length : name.length + 1;
    return fullNames
      .reduce(
        (acc, fullName) => set(
          acc,
          fullName.slice(suffixNameStartIndex),
          getter(fullName)
        ),
        isArrayValue ? [] : {}
      );
  }

  getFieldsValue = (names) => {
    return this.getNestedFields(names, this.getFieldValue);
  }

  getFieldValue = (name) => {
    const { fields } = this;
    return this.getNestedField(name, (fullName) => this.getValueFromFields(fullName, fields));
  }

  getFieldsError = (names) => {
    return this.getNestedFields(names, this.getFieldError);
  }

  getFieldError = (name) => {
    return this.getNestedField(
      name,
      (fullName) => getErrorStrs(this.getFieldMember(fullName, 'errors'))
    );
  }

  isFieldValidating = (name) => {
    return this.getFieldMember(name, 'validating');
  }

  isFieldsValidating = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => this.isFieldValidating(n));
  }

  isFieldTouched = (name) => {
    return this.getFieldMember(name, 'touched');
  }

  isFieldsTouched = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => this.isFieldTouched(n));
  }

  // @private
  // BG: `a` and `a.b` cannot be use in the same form
  isValidNestedFieldName(name) {
    const names = this.getAllFieldsName();
    return names.every(n => !partOf(n, name) && !partOf(name, n));
  }

  clearField(name) {
    delete this.fields[name];
    delete this.fieldsMeta[name];
  }
}

export default function createFieldsStore(fields) {
  return new FieldsStore(fields);
}
