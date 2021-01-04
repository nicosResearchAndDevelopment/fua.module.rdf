const
    { join: joinPath } = require('path'),
    { pathToFileURL } = require('url'),
    { Namespace } = require('rdflib'),
    SHACLValidator = require('rdf-validate-shacl'),
    rdfLib = require('rdflib'),
    context = require('./data/context.json'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        shapesURI = pathToFileURL(joinPath(__dirname, 'data/my-shapes.ttl')).toString(),
        dataURI = pathToFileURL(joinPath(__dirname, 'data/my-data.ttl')).toString(),
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

    // console.log(report);
    console.log(await report.dataset.exportTTL({
        rdf: context.rdf,
        rdfs: context.rdfs,
        owl: context.owl,
        dc: context.dc,
        sh: context.sh
    }));
    debugger;

})(/* async-iife */).catch(console.error);