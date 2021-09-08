const
    {inspect}        = require('util'),
    {join: joinPath} = require('path'),
    // new persistence module
    persistence      = require('@nrd/fua.module.persistence'),
    factory          = new persistence.TermFactory(),
    // experimental load function
    loadSpace        = require('../../src/module.rdf.load.js'),
    // common rdf serializer, working with streams
    rdfSerializer    = require('rdf-serialize').default,
    // turns a stream of strings into a promise returning a string
    streamToString   = (stream) => new Promise((resolve, reject) => {
        const chunks = [];
        stream
            .on('data', chunk => chunks.push(chunk))
            .on('error', err => reject(err))
            .on('end', () => resolve(chunks.join('')));
    }),
    // all used prefixes
    prefixes         = {
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        owl:  'http://www.w3.org/2002/07/owl#',
        ex:   'http://example.org/'
    },
    // converts the prefix object into a list of replacer functions
    replacerList     = Object.entries(prefixes).map(([prefix, uri]) => {
        const regex = new RegExp('"' + uri.replace(/[./+*?\\^$([{|]/g, (match) => '\\' + match) + '(\\S+?)"', 'g');
        return (str) => str.replace(regex, (match, p0) => '"' + prefix + ':' + p0 + '"');
    }),
    // combines all prefix replacer functions into one function
    prefixReplacer   = (input) => replacerList.reduce((str, repl) => repl(str), input);

(async (/* async-iife */) => {

    // gather all resources
    console.time('loading');
    const resArr = await loadSpace.call(factory, {
        'dct:identifier': joinPath(__dirname, './res1.json'),
        'dct:format':     'application/fua.load+json'
    });
    console.timeEnd('loading');

    // merge all found data into one dataset
    const resData = new persistence.Dataset();
    for (let res of resArr) {
        if (res.dataset) resData.add(res.dataset);
    }

    const
        // serialize the dataset to jsonld
        resLD   = await streamToString(rdfSerializer.serialize(
            resData.toStream(),
            {contentType: 'application/ld+json'}
        )),
        // make a nice object with prefixed IRIs
        results = {
            '@context': prefixes,
            '@graph':   JSON.parse(prefixReplacer(resLD))
        };

    // display the results
    console.log('results:', inspect(results, {depth: Infinity, colors: true}));
    debugger;

})(/* async-iife */).catch(console.error);
