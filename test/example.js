const
    { loadDataset, loadGraph } = require('../src/module.rdf.js');

(async (/* async-iife */) => {

    const dataset = await loadDataset(__dirname, 'data', 'my-data.ttl');
    console.log(Object.values(dataset._entities).join("\n"));
    // console.log(dataset);

    // const graph = await loadGraph(__dirname, 'data', 'my-data.ttl');
    // console.log(graph);

    debugger;

})(/* async-iife */).catch(console.error);