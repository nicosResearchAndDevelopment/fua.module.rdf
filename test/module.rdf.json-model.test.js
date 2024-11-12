const
    {describe, test} = require('mocha'),
    {inspect}        = require('util'),
    logDeep          = (obj) => console.log(inspect(obj, {depth: Infinity})),
    expect           = require('expect'),
    {join: joinPath} = require('path'),
    {TermFactory}    = require('@nrd/fua.module.persistence'),
    context          = require('./data/context.json'),
    factory          = new TermFactory(context),
    rdf              = require('../src/rdf.js'),
    jsonModel        = require('../src/json-model.js');

describe('module.rdf.json-model', function () {

    test('Graph.fromDataset', async function () {
        const
            /** @type {Array<{}>} */
            dataFiles = await rdf.loadDataFiles([{
                'dct:identifier': joinPath(__dirname, 'data/my-data.ttl'),
                'dct:format':     'text/turtle',
                'dct:title':      'my-data'
            }], factory),
            datasets  = Object.fromEntries(dataFiles.map(entry => [entry.title, entry.dataset])),
            // options   = {
            //     meshed:   true,
            //     blanks:   false,
            //     compact:  true,
            //     lists:    false,
            //     prefixes: true,
            //     strings:  true,
            //     types:    false
            // },
            options   = {
                meshed:   true,
                blanks:   false,
                compact:  true,
                lists:    true,
                prefixes: true,
                strings:  true,
                types:    false
            },
            graph     = jsonModel.Graph.fromDataset(datasets['my-data'], options);

        expect(graph).toBeInstanceOf(Map);
        expect(graph.size).toBeGreaterThan(0);

        const ex_hello = graph.get('ex:Hello');
        expect(ex_hello).toBeInstanceOf(jsonModel.Resource);
        //expect(ex_hello['ex:list'][0]).toBeInstanceOf(jsonModel.List);

        // console.log(graph);
        logDeep(ex_hello);
        debugger;
    });

});
