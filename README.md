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
    transformStream(quadStream: Stream<Quad>, transformer: (Quad, TermFactory) => Quad, factory: TermFactory): Stream<Quad>;
    loadDataFiles(config: FuaLoadRDF, factory?: TermFactory): Promise<Array<{identifier: string, format: string. title: string, alternative: string, requires: Array<string>}>>;
    generateGraph(dataset: Dataset, context?: Object<Prefix, URI>, options?: {compact: boolean, meshed: boolean, blanks: boolean}): Map<URI, Object>;
};

interface FuaLoadRDF {
    '@context'?:        'fua.load.rdf';  // optional: load config identifier
    'dct:identifier':   string;          // relative of absolute file path
    'dct:format':       string;          // contentType of the file, 'application/fua.load+js' available
    'dct:title'?:       string;          // optional: the title of the file
    'dct:alternative'?: string;          // optional: an alternative title for the file
    'dct:requires'?:    Array<LoadJSON>; // optional: an array of requirements
};
```