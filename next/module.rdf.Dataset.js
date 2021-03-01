const
    {Dataset}                           = require('@nrd/fua.module.persistence'),
    {Readable, Writable}                = require('stream'),
    {createReadStream, readFile}        = require('fs'),
    {fileURLToPath, pathToFileURL, URL} = require('url'),
    isFileURL                           = (re => re.test.bind(re))(/^file:\/\//),
    fetch                               = require('node-fetch'),
    SHACLValidator                      = require('rdf-validate-shacl'),
    {StreamParser, Writer}              = require('n3'),
    jsonld                              = require('jsonld');

function wrapFactory(dataset) {
    const factory        = {};
    factory.namedNode    = (v) => dataset.factory.namedNode(v);
    let vi               = 1;
    factory.blankNode    = (v) => dataset.factory.blankNode(v || (vi++).toString());
    factory.literal      = (v, l) => dataset.factory.literal(v, l);
    factory.variable     = (v) => dataset.factory.variable(v);
    factory.defaultGraph = () => dataset.factory.defaultGraph();
    factory.quad         = (s, p, o, g) => dataset.factory.quad(s, p, o, g);
    factory.fromTerm     = (t) => dataset.factory.fromTerm(t);
    factory.fromQuad     = (q) => dataset.factory.fromQuad(q);
    factory.dataset      = (q) => new Dataset(q, dataset.factory);
    return factory;
} // wrapFactory

class ExtendedDataset extends Dataset {

    /**
     * https://rdf.js.org/dataset-spec/#dfn-import
     * @param {Readable<Quad>} stream
     * @returns {Promise}
     */
    async import(stream) {
        await this.addStream(stream);
    } // Dataset#import

    /**
     * Can be used to import a stream with ttl content.
     * @param {Readable<TTL>} stream
     * @returns {Promise}
     */
    async importTTL(stream) {
        const parser = new StreamParser({
            factory: wrapFactory(this)
        });
        return this.import(parser.import(stream));
    } // Dataset#importTTL

    /**
     * Can be used to import a stream with ttl content.
     * @param {Readable<TTL>} stream
     * @returns {Promise}
     */
    async importJSONLD(stream) {
        let jsonDoc = '';
        stream.on('data', chunk => {
            jsonDoc += chunk;
        });
        await new Promise(resolve => stream.on('end', resolve));
        const nQuads     = await jsonld.toRDF(JSON.parse(jsonDoc), {format: 'application/n-quads'});
        const quadStream = Readable.from(nQuads.split('\n'));
        const parser     = new StreamParser({
            factory: wrapFactory(this)
        });
        return this.import(parser.import(quadStream));
    } // Dataset#importJSON

    /**
     * Can be used to load a ttl file from disc or from the web.
     * @param {URI} uri
     * @returns {Promise}
     */
    async loadTTL(uri) {
        if (uri instanceof URL) uri = uri.toString();
        if (isFileURL(uri)) {
            const reader = createReadStream(fileURLToPath(uri));
            return this.importTTL(reader);
        } else {
            const response = await fetch(uri, {
                method:  'get',
                headers: {Accept: 'text/turtle'}
            });
            return this.importTTL(response.body);
        }
    } // Dataset#loadTTL

    /**
     * Can be used to load a json-ld file from disc or from the web.
     * @param {URI} uri
     * @returns {Promise}
     */
    async loadJSONLD(uri) {
        if (uri instanceof URL) uri = uri.toString();
        if (isFileURL(uri)) {
            const reader = createReadStream(fileURLToPath(uri));
            return this.importJSONLD(reader);
        } else {
            const response = await fetch(uri, {
                method:  'get',
                headers: {Accept: 'application/ld+json'}
            });
            return this.importJSONLD(response.body);
        }
    } // Dataset#loadJSON

    /**
     * Can be used to generate a map with fully meshed nodes.
     * @param {Object<Prefix, URI>} [context={}]
     * @param {Boolean} [compact=true]
     * @param {Boolean} [meshed=true]
     * @param {Boolean} [blanks=false]
     * @returns {Map<URI, Object>}
     */
    generateGraph(context = {}, {compact = true, meshed = true, blanks = false} = {}) {
        const
            /** @type {Map<URI, Object>} */
            subjectMap = new Map(),
            /** @type {Map<URI, { "@id": String, [missingRef]: Array<[URI, URI]> }>} */
            missingMap = new Map(),
            /** @type {Map<URI, Object>} */
            blankMap   = new Map(),
            /** @type {Map<URI, URI>} */
            idMap      = new Map([
                ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type', '@type']
            ]),
            /** @type {Map<Prefix, URI>} */
            prefixMap  = new Map(Object.entries(context));

        /**
         * This function prefixes uris and caches them for this generation.
         * @param {URI} uri
         * @returns {URI}
         */
        function _prefixId(uri) {
            // return if already in idMap
            if (idMap.has(uri))
                return idMap.get(uri);

            // compact means, no prefixes gets registered
            if (!compact) return uri;

            // search all prefixes
            for (let [prefix, target] of prefixMap.entries()) {
                // if uri starts with a prefix, save entry in idMap and return
                if (uri.startsWith(target)) {
                    let short = prefix + ":" + uri.substring(target.length);
                    idMap.set(uri, short);
                    return short;
                }
            }

            // if not returned already, there is no prefix for this uri
            idMap.set(uri, uri);
            return uri;
        } // _prefixId

        /**
         * This function takes a term, returns the corresponding value in jsonld and caches any nodes.
         * @param {Term} term
         * @returns {{"@id": String} | Object | String}
         */
        function _parseTerm(term) {
            let nodeId, node;
            switch (term.termType) {
                case 'NamedNode':
                    nodeId = _prefixId(term.value);
                    node   = subjectMap.get(nodeId) || missingMap.get(nodeId);
                    if (!node) {
                        node = {'@id': nodeId};
                        missingMap.set(nodeId, node);
                    }
                    break;

                case 'BlankNode':
                    nodeId = term.value;
                    node   = blankMap.get(nodeId);
                    if (!node) {
                        node = blanks ? {'@id': nodeId} : {};
                        blankMap.set(nodeId, node);
                    }
                    break;

                case 'Literal':
                    if (term.lang) {
                        node = {
                            '@value':    term.value,
                            '@language': term.lang
                        };
                    } else if (term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
                        node = {
                            '@value': term.value,
                            '@type':  _prefixId(term.datatype.value)
                        };
                    } else {
                        node = term.value;
                    }
                    break;

                default:
                    node = null;
                    break;
            }
            return node;
        } // _parseTerm

        /**
         * This function takes a quad and processes it to fill the graph and mesh nodes.
         * @param {{subject: Term, predicate: Term, object: Term, graph: Term}} term
         * @returns {undefined}
         */
        function _processQuad({subject, predicate, object, graph}) {
            const
                subj = _parseTerm(subject),
                pred = _prefixId(predicate.value),
                obj  = meshed || object.termType !== 'NamedNode' || (blanks && object.termType === 'BlankNode')
                    ? _parseTerm(object)
                    : {'@id': _parseTerm(object)['@id']};

            // add object to subject
            if (Array.isArray(subj[pred])) {
                subj[pred].push(obj);
            } else if (Reflect.has(subj, pred)) {
                subj[pred] = [subj[pred], obj];
            } else {
                subj[pred] = obj;
            }

            // move from missingMap to subjectMap, if necessary
            if (missingMap.has(subj['@id'])) {
                missingMap.delete(subj['@id']);
                subjectMap.set(subj['@id'], subj);
            }
        } // _processQuad

        // iterates over all quads, parses their terms and meshes them
        Array.from(this).forEach(_processQuad);
        if (blanks) blankMap.forEach(blankNode => subjectMap.set(blankNode['@id'], blankNode));
        return subjectMap;
    } // Dataset#generateGraph

    /**
     * Can be used to validate this dataset, if the given dataset contains shacl shapes.
     * @param {Dataset} shapeset
     * @returns {ValidationReport} https://www.npmjs.com/package/rdf-validate-shacl
     */
    shaclValidate(shapeset) {
        const
            validator = new SHACLValidator(shapeset, {factory: wrapFactory(this)}),
            report    = validator.validate(this);
        return report;
    } // Dataset#shaclValidate

    async exportTTL(context = {}) {
        const writer = new Writer({
            prefixes: context
        });
        for (let quad of this) {
            writer.addQuad(quad);
        }
        const result = await new Promise((resolve, reject) => writer.end(
            (err, result) => err ? reject(err) : resolve(result)
        ));
        return result;
    } // Dataset#exportTTL

} // ExtendedDataset

module.exports = ExtendedDataset;