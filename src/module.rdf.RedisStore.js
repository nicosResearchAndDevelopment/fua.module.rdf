const
    Dataset = require('./module.rdf.Dataset.js');

/**
 * @param {*} value
 * @param {String} errMsg
 * @param {Class<Error>} [errType=Error]
 * @throws {Error<errType>} if the value is falsy
 */
function assert(value, errMsg, errType = Error) {
    if (!value) {
        const err = new errType(`module.rdf.RedisStore : ${errMsg}`);
        Error.captureStackTrace(err, assert);
        throw err;
    }
} // assert

class RedisStore {

    #client = null;

    constructor(client) {
        assert(client && typeof client === 'object' && typeof client.HGET === 'function',
            "The client must be a redis client instance.");
        this.#client = client;
    } // RedisStore#constructor

    async import(dataset) {
        await Promise.all(Array.from(dataset).map(async ({subject, predicate, object, graph}) => {
            if(subject.termType !== 'NamedNode') return;
            if(predicate.termType !== 'NamedNode') return;
            // const key = `<${subject.value}> <${predicate.value}>`;
            // this.#client.hset(key, object.toString());
            this.#client.hset(subject.toString(), predicate.toString(), object.toString());
        }));
        debugger;
    } // RedisStore#import

} // RedisStore

module.exports = RedisStore;