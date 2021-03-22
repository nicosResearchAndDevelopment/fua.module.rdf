const
    _                      = require('./module.rdf.util.js'),
    {createReadStream}     = require('fs'),
    {readFile}             = require('fs/promises'),
    {
        join:    joinPath, isAbsolute: isAbsPath,
        dirname: getDirName, basename: getFileName, extname: getExtName
    }                      = require('path'),
    {Dataset, TermFactory} = require('@nrd/fua.module.persistence'),
    rdf                    = require('./module.rdf.js'),
    _formats               = Object.freeze({
        loadJSON: 'application/fua.load+json',
        loadJS:   'application/fua.load+js'
    }),
    _fields                = Object.freeze({
        identifier:  'dct:identifier',
        title:       'dct:title',
        alternative: 'dct:alternative',
        format:      'dct:format',
        requires:    'dct:requires'
    });

/**
 * @this TermFactory
 * @param {string} filePath
 * @param {string} contentType
 * @returns {Promise<Dataset>}
 */
async function parseRdfFile(filePath, contentType) {
    const
        textStream = createReadStream(filePath),
        quadStream = rdf.parseStream(textStream, contentType, this),
        result     = new Dataset(null, this);
    await result.addStream(quadStream);
    return result;
} // parseRdfFile

/**
 * @this TermFactory
 * @param {Map<string, Object>} loaded
 * @param {Object} param
 * @returns {Promise<string>}
 */
async function loadRegular(loaded, {
    [_fields.identifier]:  identifier = '',
    [_fields.title]:       title = '',
    [_fields.alternative]: alternative = '',
    [_fields.format]:      format = '',
    [_fields.requires]:    requires = []
}) {
    _.assert(_.isString(identifier) && isAbsPath(identifier), `load : ${_fields.identifier} must be an absolute path`);
    title = title || getFileName(identifier, getExtName(identifier));

    if (loaded.has(identifier)) return identifier;
    const result = {identifier, title, alternative, format};
    loaded.set(identifier, result);

    // result.dataset = await parseRdfFile(identifier, format);
    // result.requires = await loadRequirements(loaded, ...requires);
    [
        result.dataset,
        result.requires
    ] = await Promise.all([
        parseRdfFile.call(this, identifier, format),
        loadRequirements.call(this, loaded, ...requires)
    ]);

    return identifier;
} // loadRegular

/**
 * @this TermFactory
 * @param {Map<string, Object>} loaded
 * @param {Object} param
 * @returns {Promise<string>}
 */
async function loadReference(loaded, {
    [_fields.identifier]: filePath,
    [_fields.format]:     fileType
}) {
    _.assert(_.isString(filePath) && isAbsPath(filePath), `load : ${_fields.identifier} must be an absolute path`);
    _.assert(fileType === _formats.loadJS || fileType === _formats.loadJSON, `load : invalid ${_fields.format}`);

    let
        fileContent = (fileType === _formats.loadJS)
            ? JSON.stringify(require(filePath))
            : (await readFile(filePath)).toString().replace(/^\s*\/\/.*$/mg, ''),
        param       = JSON.parse(fileContent, (key, value) => {
            if (key === _fields.identifier && !isAbsPath(value))
                return joinPath(getDirName(filePath), value);
            else return value;
        }),
        {
            [_fields.identifier]:  identifier  = filePath,
            [_fields.title]:       title       = '',
            [_fields.alternative]: alternative = '',
            [_fields.format]:      format      = fileType,
            [_fields.requires]:    requires    = []
        }           = param;

    _.assert(identifier === filePath, `load : expected ${_fields.identifier} not be ${filePath}`);
    _.assert(format === fileType, `load : expected ${_fields.format} to be ${fileType}`);
    title = title || getFileName(identifier, getExtName(identifier));

    if (loaded.has(identifier)) return identifier;
    const result = {identifier, title, alternative, format};
    loaded.set(identifier, result);

    result.requires = await loadRequirements.call(this, loaded, ...requires);

    return identifier;
} // loadReference

/**
 * @this TermFactory
 * @param {Map<string, Object>} loaded
 * @param {...Object} requires
 * @returns {Promise<Array>}
 */
async function loadRequirements(loaded, ...requires) {
    return Promise.all(requires.map(async (param) => {
        _.assert(_.isObject(param), `load : invalid param`, TypeError);
        switch (param[_fields.format]) {
            case _formats.loadJSON:
            case _formats.loadJS:
                return loadReference.call(this, loaded, param);

            default:
                return loadRegular.call(this, loaded, param);
        } // switch
    }));
} // loadRequirements

/**
 * @this TermFactory
 * @param {Object} param
 * @returns {Promise<Array<Object>>}
 */
module.exports = async function (param) {
    _.assert(this instanceof TermFactory, 'load : invalid this', TypeError);
    const loaded = new Map();
    await loadRequirements.call(this, loaded, ...(Array.isArray(param) ? param : [param]));
    return Array.from(loaded.values());
}; // exports