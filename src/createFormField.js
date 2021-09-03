
/**
 * Field类，简单的包装对象fields数据，
 * 用于方便确认fields是否已经经过处理，处理过的fields都为Field类的实例
 *
 * @class Field
 */
class Field {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

/**
 * 判断对象obj是否属于Field实例，
 * 也就是判断obj对象是否已经经过处理
 *
 * @export
 * @param {*} obj
 * @return {*} 
 */
export function isFormField(obj) {
  return obj instanceof Field;
}


/**
 * 根据对象field创建Field实例，
 * 如果已经是Field实例则直接返回，否则就实例化处理
 *
 * @export
 * @param {*} field
 * @return {*} 
 */
export default function createFormField(field) {
  if (isFormField(field)) {
    return field;
  }
  return new Field(field);
}
