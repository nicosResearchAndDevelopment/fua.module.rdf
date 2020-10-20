const
    { join: joinPath } = require('path'),
    { pathToFileURL } = require('url'),
    { Namespace } = require('rdflib'),
    SHACLValidator = require('rdf-validate-shacl'),
    rdfLib = require('rdflib'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        context = {
            'sh': "http://www.w3.org/ns/shacl#",
            'rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            'rdfs': "http://www.w3.org/2000/01/rdf-schema#",
            'xsd': "http://www.w3.org/2001/XMLSchema#",
            'ex': "http://example.org/stuff/1.0/",
            'owl': "http://www.w3.org/2002/07/owl#"
        },
        shapesURI = pathToFileURL(joinPath(__dirname, 'data/my-shapes.ttl')),
        dataURI = pathToFileURL(joinPath(__dirname, 'data/my-data.ttl')),
        shapesSet = new Dataset(),
        dataSet = new Dataset();

    await Promise.all([
        shapesSet.loadTTL(shapesURI),
        dataSet.loadTTL(dataURI)
    ]);

    // const validator = new SHACLValidator(shapesSet);
    // const validator = new SHACLValidator(shapesSet, { factory: rdfLib.DataFactory });
    // const validator = new SHACLValidator(shapesSet, { factory: Dataset });
    // const report = validator.validate(dataSet);
    const report = dataSet.shaclValidate(shapesSet);

    console.log(report);
    debugger;

})(/* async-iife */).catch(console.error);