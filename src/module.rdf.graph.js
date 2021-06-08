module.exports = function (dataset, context = {}, {compact = true, meshed = true, blanks = false} = {}) {
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
                if (term.language) {
                    node = {
                        '@value':    term.value,
                        '@language': term.language
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
    Array.from(dataset).forEach(_processQuad);
    if (blanks) blankMap.forEach(blankNode => subjectMap.set(blankNode['@id'], blankNode));
    return subjectMap;
}; // exports