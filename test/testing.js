const
    { promisify } = require('util'),
    stream = require('stream'),
    { Readable, Writable } = stream,
    pipeline = promisify(stream.pipeline),
    { fileURLToPath, pathToFileURL } = require('url'),
    { join: joinPath } = require('path'),
    { createReadStream } = fs = require('fs'),
    readFile = promisify(fs.readFile),
    rdfExt = require('rdf-ext'),
    ParserN3 = require('@rdfjs/parser-n3'),
    SHACLValidator = require('rdf-validate-shacl'),
    rdfLib = require('rdflib'),
    jsonld = require('jsonld'),
    N3 = require('n3'),
    fetch = require('node-fetch');

async function loadGraph (param) {
    if(typeof param === 'string') {
        if(/^https?:\/\//.test(param)) {
            const response = await fetch(param, {
                method: "GET",
                headers: {
                    Accept: "text/turtle"
                }
            });
            if(!response.ok) throw new Error(response.statusText);
            return loadGraph(response.body);
        } else if(/^file:\/\//.test(param)) {
            const fileStream = createReadStream(fileURLToPath(param));
            return loadGraph(fileStream);
        } else {
            throw "TODO -> load ttl document";
        }
    } else if(param instanceof Readable) {
        const quadStream = new N3.StreamParser();
        quadStream.import(param); // https://github.com/rdfjs/N3.js/blob/master/src/N3StreamParser.js#L33

        const quadStore = new N3.Store({ factory: rdfLib.DataFactory });
        quadStore.import(quadStream); // https://github.com/rdfjs/N3.js/blob/master/src/N3Store.js#L261

        await new Promise((resolve, reject) => quadStream.once('end', resolve).once('error', reject));
        return quadStore;
    } else {
        throw "TODO";
    }
    // -> param is an url/file-url
    // -> param is a rdf document as string/buffer/readable-stream
} // loadGraph

(async (/* async-iife */) => {

    const
        pathSegments = [__dirname, '../test', 'data/my-data.ttl'],
        filePath = joinPath(...pathSegments),
        // fileBuffer = await readFile(filePath),
        // fileStream = createReadStream(filePath),
        // quadStream = new N3.StreamParser(),
        // quadStore = new N3.Store({ factory: rdfLib.DataFactory }),
        // quadStore = await loadGraph(pathToFileURL(filePath).toString()),
        // quadStore = await loadGraph('http://www.w3.org/1999/02/22-rdf-syntax-ns'),
        quadStore = await loadGraph('https://www.google.com/'),
        quadStore2 = rdfLib.graph(/*{rdfFactory: N3.DataFactory}*/)
    ;

    /** {@link https://github.com/rdfjs/N3.js/blob/master/src/N3StreamParser.js#L33} */
    // quadStream.import(fileStream);
    /** {@link https://github.com/rdfjs/N3.js/blob/master/src/N3Store.js#L261} */
    // quadStore.import(quadStream);

    // await new Promise(resolve => setTimeout(resolve, 3));
    // await new Promise((resolve, reject) => quadStream.once('end', resolve).once('error', reject));

    // console.log(quadStore);
    quadStore2.addAll(quadStore.getQuads());

    // quadStore2.addAll(quadStore.getQuads().map(quad => new rdfLib.Statement(
    //     new rdfLib[quad.subject.termType](quad.subject.value),
    //     new rdfLib[quad.predicate.termType](quad.predicate.value),
    //     new rdfLib[quad.object.termType](quad.object.value),
    //     quad.graph.value ? new rdfLib[quad.graph.termType](quad.graph.value) : undefined
    // )));

    const strQuads = quadStore.getQuads().map(quad =>
        `${quad.subject.termType}<${quad.subject.value}> ` +
        `${quad.predicate.termType}<${quad.predicate.value}> ` +
        `${quad.object.termType}<${quad.object.value}>`
    );

    const strQuads2 = quadStore2.statementsMatching().map(quad =>
        `${quad.subject.termType}<${quad.subject.value}> ` +
        `${quad.predicate.termType}<${quad.predicate.value}> ` +
        `${quad.object.termType}<${quad.object.value}>`
    );

    console.log(`Quads: ${strQuads.length}`);
    console.log(strQuads.join("\n"));
    // console.log(strQuads2.join("\n"));
    console.log(`equal? ${strQuads.every(val => strQuads2.includes(val)) && strQuads2.every(val => strQuads.includes(val))}`);
    debugger;

})(/* async-iife */).catch(console.error);

/**
 * Loads a dataset of n-quads from a ttl-file.
 * @param {...String} pathSegments
 * @returns {Promise<rdfExt.DatasetExt>}
 */
async function loadDataset(...pathSegments) {
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
}

/**
 * Loads a graph of n-quads from a ttl-file.
 * @param {...String} pathSegments
 * @returns {Promise<rdfLib.IndexedFormula>}
 */
async function loadGraph(...pathSegments) {
    const
        filePath = joinPath(...pathSegments),
        fileBuffer = await readFile(filePath),
        quadStore = rdfLib.graph();

    rdfLib.parse(fileBuffer.toString(), quadStore, rdfLib.IndexedFormula.defaultGraphURI, 'text/turtle');
    return quadStore;
}