const
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const dataset = new Dataset();
    console.log(dataset);

    debugger;

})(/* async-iife */).catch(console.error);