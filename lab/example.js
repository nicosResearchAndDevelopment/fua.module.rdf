const
    { createReadStream } = require('fs'),
    { join: joinPath } = require('path'),
    { fileURLToPath, pathToFileURL } = require('url'),
    { StreamParser } = require('n3'),
    { sym: NamedNode, Namespace } = require('rdflib'),
    jsonld = require('jsonld'),
    context = require('./data/context.json'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        // filePath = joinPath(__dirname, 'data/my-data.ttl'),
        // filePath = joinPath(imPath, 'Ontology.ttl'),
        // filePath = joinPath(imPath, 'model/infrastructure/Connector.ttl'),
        filePath = joinPath(imPath, 'docs/serializations/ontology.ttl'),
        // readStream = createReadStream(filePath),
        IDS = Namespace(context.ids),
        RDF = Namespace(context.rdf),
        OWL = Namespace(context.owl),
        RDFS = Namespace(context.rdfs),
        dataset = new Dataset();

    // await dataset.importTTL(readStream);
    await Promise.all([
        dataset.loadTTL("https://www.w3.org/1999/02/22-rdf-syntax-ns"),
        dataset.loadTTL("https://www.w3.org/2000/01/rdf-schema"),
        dataset.loadTTL("https://www.w3.org/2002/07/owl"),
        dataset.loadTTL(pathToFileURL(filePath), IDS())
    ]);

    // console.log("dataset.size:", dataset.size);
    // console.log(dataset.toString());
    // console.log(dataset.match(NamedNode('https://w3id.org/idsa/core/Connector')).toString());
    // console.log(dataset.match(IDS('Connector')).toArray());
    console.log(dataset.match(null, RDFS('subClassOf'), IDS('Connector'), IDS()).toString());
    // const graphMap = dataset.generateGraph(context);
    // console.log(graphMap.get('ids:Connector'));

    // console.log(JSON.stringify({
    //     '@context': context,
    //     '@graph': [...dataset
    //         .generateGraph(context, {
    //             meshed: false,
    //             blanks: true
    //         })
    //         .values()
    //     ]
    // }, null, "\t"));
    // console.log(graphMap.get(IDS('Connector').value));
    dataset[Symbol.iterator]();
    debugger;

})(/* async-iife */).catch(console.error);