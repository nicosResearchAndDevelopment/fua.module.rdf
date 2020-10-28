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

    /**
     * @param {Dataset} dataset
     * @returns {Promise}
     */
    async import(dataset) {
        /** @type Map<String, Set<String>>} */
        const updateMap = new Map();

        function _processQuad({ subject, predicate, object, graph }) {
            let
                subjId = subject.toString(),
                predId = subjId + predicate.toString(),
                subjSet = updateMap.get(subjId),
                predSet = updateMap.get(predId);

            if(!subjSet) {
                subjSet = new Set();
                updateMap.set(subjId, subjSet);
            }

            if(!predSet) {
                predSet = new Set();
                updateMap.set(predId, predSet);
            }

            subjSet.add(predId);
            predSet.add(object.toString());
        } // _processQuad

        Array.from(dataset).forEach(_processQuad);

        await Promise.all(Array.from(updateMap.entries())
            .map(([key, valueSet]) => new Promise((resolve, reject) => {
                const callback = (err, result) => err ? reject(err) : resolve(result);
                this.#client.SADD(key, ...valueSet, callback);
            }))
        );

    } // RedisStore#import

    /**
     * @param {Term|Array<Term>} subjectArr
     * @returns {Promise<Dataset>}
     */
    async export(subjectArr) {
        if(!Array.isArray(subjectArr))
            subjectArr = [subjectArr];

        /** @type {Map<String, Map<String, String>>} */
        const resultMap = new Map(await Promise.all(subjectArr.map(async (subject) => {
            const
                /** @type {String} */
                subjKey = subject.toString(),
                /** @type {Array<String>} */
                predKeyArr = await new Promise((resolve, reject) => {
                    const callback = (err, result) => err ? reject(err) : resolve(result);
                    this.#client.SMEMBERS(subjKey, callback);
                }),
                /** @type {Array<Array<String>>} */
                objArr = await Promise.all(predKeyArr.map((predKey) => new Promise((resolve, reject) => {
                    const callback = (err, result) => err ? reject(err) : resolve(result);
                    this.#client.SMEMBERS(predKey, callback);
                }))),
                /** @type {Map<String, String>} */
                predMap = new Map(predKeyArr.map((predKey, index) => [
                    predKey.substr(subjKey.length),
                    objArr[index]
                ]));

            return [ subjKey, predMap ];
        }))); // resultMap

        // TODO: convert resultMap to Dataset
        return resultMap;
    } // RedisStore#export

} // RedisStore

module.exports = RedisStore;