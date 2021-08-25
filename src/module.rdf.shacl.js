const
    _              = require('./module.rdf.util.js'),
    {Dataset}      = require('@nrd/fua.module.persistence'),
    SHACLValidator = require('rdf-validate-shacl'),
    n3             = require('n3');

class N3Store extends n3.Store {
    [Symbol.iterator]() {
        const quads = this.getQuads();
        return quads[Symbol.iterator]();
    }

    match(...args) {
        return new N3Store(this.getQuads(...args));
    }

    add(quad) {
        this.addQuad(quad);
    }

    delete(quad) {
        this.removeQuad(quad);
    }
} // N3Store

const N3DataFactory = Object.assign({}, n3.DataFactory, {
    dataset: (quads) => new N3Store(quads),
    fromTerm(term) {
        switch (term.termType) {
            case 'NamedNode':
                return N3DataFactory.namedNode(term.value);
            case 'BlankNode':
                return N3DataFactory.blankNode(term.value);
            case 'Literal':
                return N3DataFactory.literal(term.value, term.language || N3DataFactory.fromTerm(term.datatype));
            case 'Variable':
                return N3DataFactory.variable(term.value);
            case 'DefaultGraph':
                return N3DataFactory.defaultGraph();
            case 'Quad':
                return N3DataFactory.fromQuad(term);
        }
    },
    fromQuad(quad) {
        return N3DataFactory.quad(
            N3DataFactory.fromTerm(quad.subject),
            N3DataFactory.fromTerm(quad.predicate),
            N3DataFactory.fromTerm(quad.object),
            N3DataFactory.fromTerm(quad.graph)
        );
    }
}); // N3DataFactory

/**
 * @param {Dataset} dataset
 * @returns {N3Store}
 * @private
 */
function _datasetToN3Store(dataset) {
    const store = N3DataFactory.dataset();
    for (let quad of dataset) {
        store.addQuad(N3DataFactory.fromQuad(
            dataset.factory.resolveQuad(quad)
        ));
    }
    return store;
} // _datasetToN3Store

/**
 * @param {N3Store} store
 * @param {TermFactory} factory
 * @returns {Dataset}
 * @private
 */
function _n3StoreToDataset(store, factory) {
    const quads = store.getQuads().map(quad => factory.fromQuad(quad));
    return new Dataset(quads, factory);
} // _n3StoreToDataset

/**
 * @param {Dataset} dataset
 * @param {Dataset} shapeset
 // * @returns {Promise<Dataset>}
 * @returns {Promise<{conforms: boolean, dataset: Dataset}>}
 */
module.exports = async function (dataset, shapeset) {
    /*  REM
        The following conversion of datasets into n3 stores is necessary, because the rdf-validate-shacl package
        causes bugs because of some of its dependencies. They claim that it would be compatible with
        rdf/js compliant factories, but it turned out that it was not even easily compatible with
        major rdf/js implementations, like n3 and rdflib. The N3Store and N3DataFactory are wrapper of n3
        and necessary to add missing functionality on which rdf-validate-shacl relies on. The results are
        then again transformed back into a dataset.
        */
    const
        _dataset   = _datasetToN3Store(dataset),
        _shapeset  = _datasetToN3Store(shapeset),
        _validator = new SHACLValidator(_shapeset, {factory: N3DataFactory}),
        _report    = await _validator.validate(_dataset);

    // return _n3StoreToDataset(_report.dataset, dataset.factory);
    return {
        conforms: _report.conforms,
        dataset:  _n3StoreToDataset(_report.dataset, dataset.factory)
    };
}; // exports
