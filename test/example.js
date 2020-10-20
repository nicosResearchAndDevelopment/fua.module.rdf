const
    { createReadStream } = require('fs'),
    { join: joinPath } = require('path'),
    { fileURLToPath, pathToFileURL } = require('url'),
    { StreamParser } = require('n3'),
    { sym: NamedNode, Namespace } = require('rdflib'),
    jsonld = require('jsonld'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        context = {
            'dct': "http://purl.org/dc/terms/",
            'fno': "https://w3id.org/function/ontology#",
            'foaf': "http://xmlns.com/foaf/0.1/",
            'ids': "https://w3id.org/idsa/core/",
            'idsa': "https://www.internationaldataspaces.org",
            'idsm': "https://w3id.org/idsa/metamodel/",
            'org': "http://www.w3.org/ns/org#",
            'owl': "http://www.w3.org/2002/07/owl#",
            'rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            'rdfs': "http://www.w3.org/2000/01/rdf-schema#",
            'time': "http://www.w3.org/2006/time#",
            'vann': "http://purl.org/vocab/vann/",
            'voaf': "http://purl.org/vocommons/voaf#",
            'xsd': "http://www.w3.org/2001/XMLSchema#"
        },
        imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        // filePath = joinPath(__dirname, 'data/my-data.ttl'),
        // filePath = joinPath(imPath, 'Ontology.ttl'),
        // filePath = joinPath(imPath, 'model/infrastructure/Connector.ttl'),
        filePath = joinPath(imPath, 'docs/serializations/ontology.ttl'),
        // readStream = createReadStream(filePath),
        IDS = Namespace('https://w3id.org/idsa/core/'),
        dataset = new Dataset();

    // await dataset.importTTL(readStream);
    await Promise.all([
        dataset.loadTTL("https://www.w3.org/1999/02/22-rdf-syntax-ns"),
        // dataset.loadTTL("https://www.w3.org/2000/01/rdf-schema"),
        dataset.loadTTL("https://www.w3.org/2002/07/owl"),
        dataset.loadTTL(pathToFileURL(filePath))
    ]);

    console.log("dataset.size:", dataset.size);
    // console.log(dataset.toString());
    // console.log(dataset.match(NamedNode('https://w3id.org/idsa/core/Connector')).toString());
    // console.log(dataset.match(IDS('Connector')).toString());
    const graphMap = dataset.generateGraph(context);
    console.log(graphMap.get('ids:Connector'));
    // console.log(graphMap.get(IDS('Connector').value));
    debugger;

})(/* async-iife */).catch(console.error);