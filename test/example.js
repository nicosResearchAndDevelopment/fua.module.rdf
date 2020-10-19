const
    { createReadStream } = require('fs'),
    { join: joinPath } = require('path'),
    { StreamParser } = require('n3'),
    { sym: NamedNode, Namespace } = require('rdflib'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        // filePath = joinPath(__dirname, 'data/my-data.ttl'),
        imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        // filePath = joinPath(imPath, 'Ontology.ttl'),
        filePath = joinPath(imPath, 'docs/serializations/ontology.ttl'),
        // readStream = createReadStream(filePath),
        IDS = Namespace('https://w3id.org/idsa/core/'),
        dataset = new Dataset();

    // await dataset.importTTL(readStream);
    await dataset.loadTTL(filePath);

    console.log(dataset.size);
    // console.log(dataset.toString());
    // console.log(dataset.match(NamedNode('https://w3id.org/idsa/core/Connector')).toString());
    console.log(dataset.match(IDS('Connector')).toString());
    debugger;

})(/* async-iife */).catch(console.error);