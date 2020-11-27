webpackJsonp([11],{

/***/ 14:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return regionStyle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return errorStyle; });
var regionStyle = {
  border: '1px solid red',
  marginTop: 10,
  padding: 10
};

var errorStyle = {
  color: 'red',
  marginTop: 10,
  padding: 10
};

/***/ }),

/***/ 507:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(508);


/***/ }),

/***/ 508:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_helpers_classCallCheck__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_helpers_classCallCheck___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_babel_runtime_helpers_classCallCheck__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_babel_runtime_helpers_createClass__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_babel_runtime_helpers_createClass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_babel_runtime_helpers_createClass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_babel_runtime_helpers_inherits__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_babel_runtime_helpers_inherits___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_babel_runtime_helpers_inherits__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_rc_form__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_react__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_react_dom__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_react_dom___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_react_dom__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__styles__ = __webpack_require__(14);




/* eslint react/no-multi-comp:0, no-console:0, react/prefer-stateless-function:0 */






var Form = function (_React$Component) {
  __WEBPACK_IMPORTED_MODULE_3_babel_runtime_helpers_inherits___default()(Form, _React$Component);

  function Form() {
    var _ref;

    var _temp, _this, _ret;

    __WEBPACK_IMPORTED_MODULE_0_babel_runtime_helpers_classCallCheck___default()(this, Form);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = __WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn___default()(this, (_ref = Form.__proto__ || Object.getPrototypeOf(Form)).call.apply(_ref, [this].concat(args))), _this), _this.setEmail = function () {
      _this.props.form.setFieldsValue({
        email: 'yiminghe@gmail.com'
      }, function () {
        return console.log('after');
      });
      console.log('before');
    }, _temp), __WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn___default()(_this, _ret);
  }

  __WEBPACK_IMPORTED_MODULE_1_babel_runtime_helpers_createClass___default()(Form, [{
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      console.log('didUpdate');
    }
  }, {
    key: 'render',
    value: function render() {
      var _props$form = this.props.form,
          getFieldProps = _props$form.getFieldProps,
          getFieldError = _props$form.getFieldError;

      var errors = getFieldError('email');
      return __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
        'div',
        { style: __WEBPACK_IMPORTED_MODULE_7__styles__["b" /* regionStyle */] },
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
          'div',
          null,
          'email:'
        ),
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
          'div',
          null,
          __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement('input', getFieldProps('email', {
            rules: [{
              type: 'email'
            }]
          }))
        ),
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
          'div',
          { style: __WEBPACK_IMPORTED_MODULE_7__styles__["a" /* errorStyle */] },
          errors ? errors.join(',') : null
        ),
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
          'button',
          { onClick: this.setEmail },
          'set'
        )
      );
    }
  }]);

  return Form;
}(__WEBPACK_IMPORTED_MODULE_5_react___default.a.Component);

Form.propTypes = {
  form: __WEBPACK_IMPORTED_MODULE_4_rc_form__["formShape"]
};


Form = Object(__WEBPACK_IMPORTED_MODULE_4_rc_form__["a" /* createForm */])()(Form);

var App = function (_React$Component2) {
  __WEBPACK_IMPORTED_MODULE_3_babel_runtime_helpers_inherits___default()(App, _React$Component2);

  function App() {
    __WEBPACK_IMPORTED_MODULE_0_babel_runtime_helpers_classCallCheck___default()(this, App);

    return __WEBPACK_IMPORTED_MODULE_2_babel_runtime_helpers_possibleConstructorReturn___default()(this, (App.__proto__ || Object.getPrototypeOf(App)).apply(this, arguments));
  }

  __WEBPACK_IMPORTED_MODULE_1_babel_runtime_helpers_createClass___default()(App, [{
    key: 'render',
    value: function render() {
      return __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
        'div',
        null,
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(
          'h2',
          null,
          'setFieldsValue'
        ),
        __WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(Form, null)
      );
    }
  }]);

  return App;
}(__WEBPACK_IMPORTED_MODULE_5_react___default.a.Component);

__WEBPACK_IMPORTED_MODULE_6_react_dom___default.a.render(__WEBPACK_IMPORTED_MODULE_5_react___default.a.createElement(App, null), document.getElementById('__react-content'));

/***/ })

},[507]);
//# sourceMappingURL=setFieldsValue.js.map