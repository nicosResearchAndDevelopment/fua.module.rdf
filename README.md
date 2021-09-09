# Module.RDF

## Interface

```ts
import 'rdf-parse'
import 'rdf-serialize'
import '@nrd/fua.module.persistence'

interface rdf {
    contentTypes: ['text/turtle', 'application/ld+json', 'text/rdf+xml', 'application/n-quads', 'application/n-triples', 'application/trig'];

    wrapFactory(factory: TermFactory): Object<string, Function>;

    parseStream(textStream: Stream<string>, contentType: string, factory: TermFactory): Stream<Quad>;

    serializeStream(quadStream: Stream<Quad>, contentType: string, factory: TermFactory): Stream<string>;

    serializeDataset(dataset: Dataset, contentType: string): Promise<string>;

    transformStream(quadStream: Stream<Quad>, transformer: (Quad, TermFactory) => Quad, factory: TermFactory): Stream<Quad>;

    loadDataFiles(config: FuaLoadRDF | Array<FuaLoadRDF>, factory?: TermFactory): Promise<Array<FuaLoadResult>>;

    generateGraph(dataset: Dataset, options?: { compact?: boolean, meshed?: boolean, blanks?: boolean, lists?: boolean, prefixes?: boolean, strings?: boolean, types?: boolean }): Map<URI, Object>;

    shaclValidate(dataset: Dataset, shapeset: Dataset): Promise<Dataset>;
};
```

### loadDataFiles

```ts
// SYNTAX:

interface FuaLoadRDF {
    '@context'?: 'fua.load.rdf';  // optional: load config identifier
    'dct:identifier': string;          // absolute file path for function calls, for load files also relative path allowed
    'dct:format': string;          // contentType of the file, 'application/fua.load+js' / '...+json' are available
    'dct:title'?: string;          // optional: the title of the file
    'dct:alternative'?: string;          // optional: an alternative title for the file
    'dct:requires'?: Array<FuaLoadRDF>; // optional: an array of requirements
};

interface FuaLoadResult {
    identifier: string;        // the absolute path of the file
    format: string;        // the content type of the file
    title: string;        // the title of the load config or the filename
    alternative: string;        // an alternative supplied title from the config
    requires: Array<string>; // reference identifiers from other results
    dataset?: Dataset;       // optional: if the format was an rdf content type, it will contain the loaded data
};

// DEFINITION:

const loadDataFiles = function (config: FuaLoadRDF | Array<FuaLoadRDF>, factory?: TermFactory): Promise<Array<FuaLoadResult>>;

// EXAMPLES:

// load specific rdf files (returns FuaLoadResult array with separated datasets containing the parsed data):
const load_ttl_results = await loadDataFiles([{
    'dct:identifier': joinPath(__dirname, 'data-a.ttl'),
    'dct:format': 'text/turtle'
}, {
    'dct:identifier': joinPath(__dirname, 'data-b.json'),
    'dct:format': 'application/ld+json'
}]);

// load rdf-load-script with FuaLoadRDF syntax (termFactory is optional, but contains context data):
const load_script_results = await loadDataFiles({
    'dct:identifier': joinPath(__dirname, 'load.js'),
    'dct:format': 'application/fua.load+js'
}, termFactory);

// make an object of the results with the titles as keys (unique titles assumed):
const script_result = Object.fromEntries(load_script_results.map(result => [result.title, result]));

// merge the data of all loaded datasets into one (using the same termFactory):
const script_data = new Dataset(null, termFactory);
load_script_results.filter(result => result.dataset).forEach(result => script_data.add(result.dataset));
```

### generateGraph

```ts

interface Literal {
    '@value': string;
    '@language': string;
    '@type': string | Resource | Array<string | Resource>;
};

interface Resource {
    '@id': string;

    [key: string]: string | Literal | Resource | List | Array<string | Literal | Resource | List>;
};

interface List {
    '@list': Array<string | Literal | Resource>;

    add(elem: string | Literal | Resource): void;

    insert(pos: number, elem: string | Literal | Resource): void;

    remove(pos: number): string | Literal | Resource;
};

interface Graph extends Map {
    set(id: string | Resource, resource: Resource): Resource;

    add(resource: Resource): Resource;

    delete(id: string | Resource): boolean;

    remove(id: string | Resource): Resource;

    toArray(): Array<Resource>;

    toDataset(): Dataset;

    filter(iteratee: (resource: Resource, id: string, graph: Graph) => boolean): Array<Resource>;

    queryAll(pathExpression: string): Array<any>;

    getAllByType(...types: Array<string | Resource>): Array<Resource>;

    getAllByAnyType(...types: Array<string | Resource>): Array<Resource>;
};

interface GraphOptions {
    meshed?: boolean;
    // With this option enabled, all nodes in the graph get connected.
    // With this option disabled, all nodes in the graph refer to each other with an {'@id'} reference.

    blanks?: boolean;
    // With this option enabled, all generated blank nodes get added to the graph.
    // With this option disabled, blank nodes are only available on the refering node.
    // Disabling this option enforced nesting for blanks nodes, although the meshed option might be disabled.

    compact?: boolean;
    // With this option enabled, references are only placed in arrays for more than one element.
    // With this option disabled, references are always generated as arrays.

    lists?: boolean;
    // With this option enabled, rdf:list references are collected as a json-ld list.
    // With this option disabled, lists are chains of references like in datasets.

    prefixes?: boolean;
    // With this option enabled, the prefixes from the datasets get used as is.
    // With this option disabled, prefixes are resolved back to full iris.

    strings?: boolean;
    // With this option enabled, xsd:string literals are generated as plain strings.
    // With this option disabled, all literals are generated as a literal object, no matter what.

    types?: boolean;
    // With this option enabled, @type references are generated like all other relations with an object reference.
    // With this option disabled, @type references are generated with string iris like usually in json-ld.
};

const graphOptionPresets = {
    'default': {
        // This preset is actually empty, because by default all options are enabled.
        meshed: true,
        blanks: true,
        compact: true,
        lists: true,
        prefixes: true,
        strings: true,
        types: true
    },
    'flat': {
        meshed: false,
        blanks: true,
        compact: false,
        lists: false,
        prefixes: false,
        strings: false,
        types: false
    },
    'minimal': {
        meshed: true,
        blanks: false,
        compact: true,
        lists: true,
        prefixes: true,
        strings: true,
        types: false
    }
};

const generateGraph = function (dataset: Dataset, options: GraphOptions | 'default' | 'flat' | 'minimal'): Graph;

```
