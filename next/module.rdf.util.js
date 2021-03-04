const
    _           = exports,
    MODULE_NAME = 'module.rdf';

_.assert = function (value, errMsg = 'undefined error', errType = Error) {
    if (!value) {
        const err = new errType(`${MODULE_NAME} : ${errMsg}`);
        Error.captureStackTrace(err, _.assert);
        throw err;
    }
};

_.lockProp = function (obj, ...keys) {
    const lock = {writable: false, configurable: false};
    for (let key of keys) {
        Object.defineProperty(obj, key, lock);
    }
};

_.strToRegex = function (string, flags) {
    const specialCharMatcher = /[./\\+*?([{|^$]/g;
    new RegExp(string.replace(specialCharMatcher, (match) => '\\' + match), flags);
};

_.strValidator = function (pattern) {
    return (value) => _.isString(value) && pattern.test(value);
};

_.arrValidator = function (checker) {
    return (value) => _.isArray(value) && value.every(checker);
};

_.isDefined = function (value) {
    //return value !== undefined;
    return value !== void 0;
};

_.isTruthy = function (value) {
    return !!value;
};

_.isFalsy = function (value) {
    return !value;
};

_.isBoolean = function (value) {
    return typeof value === 'boolean';
};

_.isNumber = function (value) {
    return typeof value === 'number' && !isNaN(value);
};

_.isString = function (value) {
    return typeof value === 'string';
};

_.isFunction = function (value) {
    return typeof value === 'function';
};

_.isObject = function (value) {
    return value && typeof value === 'object';
};

_.isArray = Array.isArray;

_.isIterable = function (value) {
    try {
        return _.isFunction(value[Symbol.iterator]);
    } catch (err) {
        return false;
    }
};