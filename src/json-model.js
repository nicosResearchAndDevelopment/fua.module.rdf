const
    model       = exports,
    jsonpath    = require('jsonpath'),
    assert      = require('@fua/core.assert'),
    is          = require('@fua/core.is'),
    objects     = require('@fua/core.objects'),
    persistence = require('@fua/module.persistence'),
    util        = require('./util.js');

model.Literal = class Literal {

    constructor(value, language, datatype) {
        assert(is.string(value), 'expected value to be a string', TypeError);
        assert(!language || util.isLanguageString(language), 'expected language to be a Language', TypeError);
        assert(!datatype || util.isIRIString(datatype) || datatype instanceof model.Resource
            || (is.array(datatype) && datatype.every(entry => util.isIRIString(entry) || entry instanceof model.Resource)),
            'expected datatype to be an IRI or a Resource', TypeError);
        this['@value'] = value;
        if (language) this['@language'] = language;
        else if (datatype) this['@type'] = datatype;
        objects.lock.props(this, '@value', '@language', '@type');
    } // constructor

    valueOf() {
        return util.nativeValueParser(this['@type'], this['@value']);
    } // valueOf

}; // model.Literal

model.Resource = class Resource {

    constructor(id) {
        assert(util.isIdentifierString(id), 'expected id to be an identifier', TypeError);
        this['@id'] = id;
        objects.lock.props(this, '@id');
    } // constructor

}; // model.Resource

model.List = class List {

    constructor(...elems) {
        this['@list'] = [];
        objects.lock.props(this, '@list');
        elems.flat(1).forEach(this.add.bind(this));
    } // constructor

    add(elem) {
        this['@list'].push(elem);
    }

    insert(pos, elem) {
        if (pos < 0) this['@list'].unshift(elem);
        else this['@list'].splice(pos, 0, elem);
    }

    remove(pos) {
        if (pos < 0 || pos >= this['@list'].length) return;
        return this['@list'].splice(pos, 1)[0];
    }

}; // model.List

model.Graph = class Graph extends Map {

    get [Symbol.toStringTag]() {
        return model.Graph.name;
    }

    /**
     * @param {string|model.Resource} id
     * @param {model.Resource} resource
     * @returns {model.Resource}
     */
    set(id, resource) {
        if (id instanceof model.Resource) {
            resource = id;
            id       = resource['@id'];
        } else {
            assert(resource instanceof model.Resource, 'expected resource to be a Resource', TypeError);
            assert(id === resource['@id'], 'expected id to be the @id of the resource');
        }
        super.set(id, resource);
        return resource;
    } // set

    /**
     * @param {model.Resource} resource
     * @returns {model.Resource}
     */
    add(resource) {
        assert(resource instanceof model.Resource, 'expected resource to be a Resource', TypeError);
        assert(!super.has(resource['@id']), 'expected @id of the resource to no exist already -> use .set to overwrite resources instead');
        super.set(resource['@id'], resource);
        return resource;
    } // add

    delete(id) {
        if (id instanceof model.Resource) id = id['@id'];
        return super.delete(id);
    } // delete

    remove(id) {
        if (id instanceof model.Resource) id = id['@id'];
        const resource = super.get(id);
        if (resource) {
            super.delete(id);
            return resource;
        }
    } // remove

    toArray() {
        return Array.from(super.values());
    } // toArray

    filter(iteratee) {
        assert(is.function(iteratee), 'expected iteratee to be a function', TypeError);
        const result = [];
        for (let [id, resource] of super.entries()) {
            if (iteratee(resource, id, this)) {
                result.push(resource);
            }
        }
        return result;
    } // filter

    queryAll(pathExpression) {
        assert(is.string(pathExpression), 'expected pathExpression to be a string', TypeError);
        const results = new Set();
        for (let resource of super.values()) {
            jsonpath
                .query(resource, pathExpression)
                .forEach(elem => results.add(elem));
        }
        return Array.from(results.values());
    } // queryAll

    /**
     * @param {...(string|model.Resource)} types
     * @returns {Array<model.Resource>}
     */
    getAllByType(...types) {
        const srchTypes = types.map(type => type['@id'] || type);
        const result    = [];
        for (let resource of super.values()) {
            const resTypes = objects.array(resource['@type']).map(type => type['@id'] || type);
            if (srchTypes.every(type => resTypes.includes(type))) {
                result.push(resource);
            }
        }
        return result;
    } // getAllByType

    /**
     * @param {...(string|model.Resource)} types
     * @returns {Array<model.Resource>}
     */
    getAllByAnyType(...types) {
        const srchTypes = types.map(type => type['@id'] || type);
        const result    = [];
        for (let resource of super.values()) {
            const resTypes = objects.array(resource['@type']).map(type => type['@id'] || type);
            if (srchTypes.some(type => resTypes.includes(type))) {
                result.push(resource);
            }
        }
        return result;
    } // getAllByAnyType

    literal(...args) {
        return new model.Literal(...args);
    } // literal

    resource(...args) {
        return new model.Resource(...args);
    } // resource

    list(...args) {
        return new model.List(...args);
    } // list

    /**
     * @param {persistence.TermFactory} factory
     */
    toDataset(factory) {
        assert(factory instanceof persistence.TermFactory, 'expected factory to be a TermFactory', TypeError);
        assert(false, 'not implemented yet');
        // TODO
    } // toDataset

    /**
     * @param {persistence.Dataset} dataset
     * @param {object} [options={}] REM The options make this method really hard to read and understand!
     * @param {object} [options.meshed=true]
     * @param {object} [options.blanks=true]
     * @param {object} [options.compact=true]
     * @param {object} [options.lists=true]
     * @param {object} [options.prefixes=true]
     * @param {object} [options.strings=true]
     * @param {object} [options.types=true]
     * @returns {model.Graph}
     */
    static fromDataset(dataset, options = {}) {
        assert(dataset instanceof persistence.Dataset, 'expected dataset to be a Dataset', TypeError);
        assert(is.object(options), 'expected options to be an object', TypeError);

        const
            optMeshed   = options.meshed ?? true,
            optBlanks   = options.blanks ?? true,
            optCompact  = options.compact ?? true,
            optLists    = options.lists ?? true,
            optPrefixes = options.prefixes ?? true,
            optStrings  = options.strings ?? true,
            optTypes    = options.types ?? true,
            graph       = new model.Graph(),
            missing     = new model.Graph(),
            rdf_type    = _resolveUri('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            rdf_first   = _resolveUri('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
            rdf_rest    = _resolveUri('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
            rdf_nil     = _resolveUri('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'),
            xsd_string  = _resolveUri('http://www.w3.org/2001/XMLSchema#string');

        function _resolveUri(uri) {
            return optPrefixes ? dataset.factory.namedNode(uri).value : uri;
        } // _resolveUri

        function _resolveTerm(term) {
            return dataset.factory.termToId(optPrefixes ? term : dataset.factory.resolveTerm(term));
        } // _resolveTerm

        function _extendResource(subjNode, predKey, objNode) {
            if (!(predKey in subjNode)) {
                subjNode[predKey] = optCompact ? objNode : [objNode];
            } else if (is.array(subjNode[predKey])) {
                subjNode[predKey].push(objNode);
            } else {
                subjNode[predKey] = [subjNode[predKey], objNode];
            }
        } // _extendResource

        function _getSubjectNode(subject) {
            const subjId = _resolveTerm(subject);
            if (graph.has(subjId)) return graph.get(subjId);
            if (subject.termType !== 'BlankNode' || optBlanks)
                return graph.add(missing.remove(subjId) || new model.Resource(subjId));
            return missing.get(subjId)
                || missing.add(new model.Resource(subjId));
        } // _getSubjectNode

        function _getObjectNode(object) {
            if (object.termType === 'Literal') {
                let datatype = _resolveTerm(object.datatype);
                if (optStrings && datatype === xsd_string)
                    return object.value;
                datatype = optTypes ? _getObjectNode(object.datatype) : datatype;
                return new model.Literal(object.value, object.language, optCompact ? datatype : [datatype]);
            }
            const objId   = _resolveTerm(object);
            const objNode = graph.get(objId)
                || missing.get(objId)
                || missing.add(new model.Resource(objId));
            if (optMeshed || !optBlanks && object.termType === 'BlankNode')
                return objNode;
            return new model.Resource(objNode['@id']);
        } // _getObjectNode

        function _getPredicateKey(predicate) {
            return predicate.value === rdf_type ? '@type' : _resolveTerm(predicate);
        } // _getPredicateKey

        for (let {subject, predicate, object} of dataset) {
            const
                subjNode = _getSubjectNode(subject),
                objNode  = _getObjectNode(object),
                predKey  = _getPredicateKey(predicate);
            _extendResource(subjNode, predKey, optTypes || predKey !== '@type' ? objNode : objNode['@id']);
        } // for (quad of dataset)

        if (optLists) {
            function _isListNode(objNode) {
                if (!is.object(objNode)) return false;
                if (objNode['@id'] === rdf_nil) return true;
                if (!optMeshed) objNode = graph.get(objNode['@id']) || missing.get(objNode['@id']) || objNode;
                return rdf_first in objNode;
            } // _isListNode

            function _collectList(objNode) {
                const listNode = new model.List();
                while (objNode && objNode['@id'] !== rdf_nil) {
                    if (!optMeshed) objNode = graph.get(objNode['@id']) || missing.get(objNode['@id']) || objNode;
                    graph.delete(objNode);
                    const firstNode = objNode[rdf_first], restNode = objNode[rdf_rest];
                    listNode.add(optCompact ? firstNode : firstNode[0]);
                    objNode = optCompact ? restNode : restNode[0];
                }
                return listNode;
            } // _collectList

            function _searchNodes(nodeIterator) {
                for (let subjNode of nodeIterator) {
                    for (let [predKey, objNode] of Object.entries(subjNode)) {
                        if (predKey.startsWith('@')) continue;
                        if (is.array(objNode)) {
                            for (let [index, entryNode] of objNode.entries()) {
                                if (_isListNode(entryNode)) objNode[index] = _collectList(entryNode);
                            }
                        } else {
                            if (_isListNode(objNode)) subjNode[predKey] = _collectList(objNode);
                        }
                    }
                }
            } // _searchNodes

            _searchNodes(graph.values());
            _searchNodes(missing.values());
        } // if (optLists)

        return graph;
    } // static fromDataset

}; // model.Graph
