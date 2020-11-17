const
    context = require('./data/context.json'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const dataset = new Dataset();
    await dataset.loadJSON('http://xmlns.com/foaf/0.1');
    console.log(await dataset.exportTTL(context));
    debugger;

})(/* async-iife */).catch(console.error);