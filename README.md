# Module.RDF

<!-- TODO: write the second half of the Dataset specification -->
<!-- TODO: what about https://rdf.js.org/dataset-spec/#issue-container-generatedID-0 ? -->

```typescript
const {
    Dataset
} = require('fua.module.rdf')
```

## [Dataset](https://rdf.js.org/dataset-spec/)

```typescript
let dataset = new Dataset(quads?: Quad): Dataset
```

__Parameters__

- `Optional` __quads:__ Quad[]

### [Dataset<>.add](https://rdf.js.org/dataset-spec/#dfn-add)

```typescript
dataset.add(quad: Quad): Dataset
```

Adds the specified [quad](https://rdf.js.org/data-model-spec/#quad-interface) to the dataset.

This method returns the dataset instance it was called on.

Existing quads, as defined in [Quad.equals](https://rdf.js.org/data-model-spec/#dfn-equals), will be ignored.

__Parameters__

- __quad:__ [Quad](https://rdf.js.org/data-model-spec/#quad-interface)

__Returns__ [Dataset](https://rdf.js.org/dataset-spec/#dfn-dataset)

### [Dataset<>.delete](https://rdf.js.org/dataset-spec/#dfn-delete)

```typescript
dataset.delete(quad: Quad): Dataset
```

Removes the specified [quad](https://rdf.js.org/data-model-spec/#quad-interface) from the dataset.

This method returns the dataset instance it was called on.

__Parameters__

- __quad:__ [Quad](https://rdf.js.org/data-model-spec/#quad-interface)

__Returns__ [Dataset](https://rdf.js.org/dataset-spec/#dfn-dataset)

### [Dataset<>.has](https://rdf.js.org/dataset-spec/#dfn-has)

```typescript
dataset.has(quad: Quad): boolean
```

Determines whether a dataset includes a certain quad, returning true or false as appropriate.

__Parameters__

- __quad:__ [Quad](https://rdf.js.org/data-model-spec/#quad-interface)

__Returns__ _boolean_

### [Dataset<>.match](https://rdf.js.org/dataset-spec/#dfn-match)

```typescript
dataset.match(subject? Term, predicate? Term, object? Term, graph? Term): Dataset
```

This method returns a new dataset that is comprised of all quads in the current instance matching the given arguments. The logic described in [Quad Matching](https://rdf.js.org/dataset-spec/#quad-matching) is applied for each quad in this dataset to check if it should be included in the output dataset.

Note: This method always returns a new [DatasetCore](https://rdf.js.org/dataset-spec/#dfn-datasetcore), even if that dataset contains no quads.

Note: Since a [DatasetCore](https://rdf.js.org/dataset-spec/#dfn-datasetcore) is an unordered set, the order of the quads within the returned sequence is arbitrary.

__Parameters__

- `Optional` __subject:__ [Term](https://rdf.js.org/data-model-spec/#term-interface)
- `Optional` __predicate:__ [Term](https://rdf.js.org/data-model-spec/#term-interface)
- `Optional` __object:__ [Term](https://rdf.js.org/data-model-spec/#term-interface)
- `Optional` __graph:__ [Term](https://rdf.js.org/data-model-spec/#term-interface)

__Returns__ [Dataset](https://rdf.js.org/dataset-spec/#dfn-dataset)