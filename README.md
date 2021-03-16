# Module.RDF

## Interface

```ts
import 'rdf-parse'
import 'rdf-serialize'
import '@nrd/fua.module.persistence'

interface rdf {
    wrapFactory(factory: TermFactory): Object<string, Function>;
    parseStream(textStream: Stream<string>, contentType: string, factory: TermFactory): Stream<Quad>;
    serializeStream(quadStream: Stream<Quad>, contentType: string, factory: TermFactory): Stream<string>;
    transformStream(quadStream: Stream<Quad>, transformer: (Quad, TermFactory) => Quad, factory: TermFactory): Stream<Quad>;
    generateGraph(dataset: Dataset, context?: Object<Prefix, URI>, options?: {compact: boolean, meshed: boolean, blanks: boolean}): Map<URI, Object>;
};
```