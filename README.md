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
    generateGraph(dataset: Dataset, context?: Object<Prefix, URI>, options?: {compact: boolean, meshed: boolean, blanks: boolean}): Map<URI, Object>;
    shaclValidate(dataset: Dataset, shapeset: Dataset): Promise<Dataset>;
};
```

### loadDataFiles

```ts
// SYNTAX:

interface FuaLoadRDF {
    '@context'?:        'fua.load.rdf';  // optional: load config identifier
    'dct:identifier':   string;          // absolute file path for function calls, for load files also relative path allowed
    'dct:format':       string;          // contentType of the file, 'application/fua.load+js' / '...+json' are available
    'dct:title'?:       string;          // optional: the title of the file
    'dct:alternative'?: string;          // optional: an alternative title for the file
    'dct:requires'?:    Array<FuaLoadRDF>; // optional: an array of requirements
};

interface FuaLoadResult {
    identifier:  string;        // the absolute path of the file
    format:      string;        // the content type of the file
    title:       string;        // the title of the load config or the filename
    alternative: string;        // an alternative supplied title from the config
    requires:    Array<string>; // reference identifiers from other results
    dataset?:    Dataset;       // optional: if the format was an rdf content type, it will contain the loaded data
};

// DEFINITION:

const loadDataFiles = function(config: FuaLoadRDF | Array<FuaLoadRDF>, factory?: TermFactory): Promise<Array<FuaLoadResult>>;

// EXAMPLES:

// load specific rdf files (returns FuaLoadResult array with separated datasets containing the parsed data):
const load_ttl_results = await loadDataFiles([{
    'dct:identifier': joinPath(__dirname, 'data-a.ttl'),
    'dct:format':     'text/turtle'
}, {
    'dct:identifier': joinPath(__dirname, 'data-b.json'),
    'dct:format':     'application/ld+json'
}]);

// load rdf-load-script with FuaLoadRDF syntax (termFactory is optional, but contains context data):
const load_script_results = await loadDataFiles({
    'dct:identifier': joinPath(__dirname, 'load.js'),
    'dct:format':     'application/fua.load+js'
}, termFactory);

// make an object of the results with the titles as keys (unique titles assumed):
const script_result = Object.fromEntries(load_script_results.map(result => [result.title, result]));

// merge the data of all loaded datasets into one (using the same termFactory):
const script_data = new Dataset(null, termFactory);
load_script_results.filter(result => result.dataset).forEach(result => script_data.add(result.dataset));
```