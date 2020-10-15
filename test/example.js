const
    { createReadStream } = require('fs'),
    { join: joinPath } = require('path'),
    { StreamParser } = require('n3'),
    { sym: NamedNode } = require('rdflib'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        readStream = createReadStream(joinPath(__dirname, 'data/my-data.ttl')),
        // imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        // readStream = createReadStream(joinPath(imPath, 'Ontology.ttl')),
        // readStream = createReadStream(joinPath(imPath, 'model/infrastructure/Connector.ttl')),
        dataset = new Dataset();

    await dataset.importTTL(readStream);

    console.log(dataset.toString());
    // console.log(dataset.match(NamedNode('https://w3id.org/idsa/core/Connector')).toString());
    debugger;

})(/* async-iife */).catch(console.error);