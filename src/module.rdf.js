const
    { promisify } = require('util'),
    { join: joinPath } = require('path'),
    { createReadStream } = fs = require('fs'),
    readFile = promisify(fs.readFile),
    rdfExt = require('rdf-ext'),
    ParserN3 = require('@rdfjs/parser-n3'),
    SHACLValidator = require('rdf-validate-shacl'),
    rdfLib = require('rdflib'),
    N3 = require('n3');

// NOTE currently under development (experimentation phase)

/**
 * Loads a dataset of n-quads from a ttl-file.
 * @param {...String} pathSegments
 * @returns {Promise<rdfExt.DatasetExt>}
 */
exports.loadDataset = async function (...pathSegments) {
    const
        filePath = joinPath(...pathSegments),
        fileStream = createReadStream(filePath),
        // streamParser = new ParserN3({ factory: rdfExt }),
        streamParser = new N3.StreamParser(),
        // streamParser = new N3.StreamParser({ factory: rdfExt }),
        quadStream = streamParser.import(fileStream),
        quadDataset = await rdfExt.dataset().import(quadStream),
        quadArray = quadDataset.toArray();

    return quadDataset;
};

/**
 * Loads a graph of n-quads from a ttl-file.
 * @param {...String} pathSegments
 * @returns {Promise<rdfLib.IndexedFormula>}
 */
exports.loadGraph = async function(...pathSegments) {
    const
        filePath = joinPath(...pathSegments),
        fileBuffer = await readFile(filePath),
        quadStore = rdfLib.graph();

    rdfLib.parse(fileBuffer.toString(), quadStore, rdfLib.IndexedFormula.defaultGraphURI, 'text/turtle');
    return quadStore;
};