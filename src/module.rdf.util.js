const
    _             = exports,
    {PassThrough} = require('stream'),
    MODULE_NAME   = 'module.rdf';

_.mergeStreams = function (...streams) {
    if (streams.length < 2) return streams[0];
    const pass  = new PassThrough();
    let waiting = streams.length;
    for (let stream of streams) {
        stream.pipe(pass, {end: false});
        stream.once('end', () => --waiting === 0 && pass.end());
    }
    return pass;
};

_.concatStreams = function (...streams) {
    if (streams.length < 2) return streams[0];
    const pass = new PassThrough();
    for (let i = 1; i < streams.length; i++) {
        const prev = streams[i - 1], next = streams[i];
        prev.once('end', () => next.pipe(pass, {end: false}));
    }
    const first = streams[0], last = streams[streams.length - 1];
    first.pipe(pass, {end: false});
    last.once('end', () => pass.end());
    return pass;
};

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