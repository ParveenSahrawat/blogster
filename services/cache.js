const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

/**
 * For applying caching ability to a query
 * @param {options}
 * @returns {mongoose.Query.prototype}
 */
mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}

/**
 * To get data from cache if available, otherwise get data from cache
 * and also set into cache
 * @returns {mongoose.Query.prototype.model} data of mongoose model type
 */
mongoose.Query.prototype.exec = async function () {
    if(!this.useCache)
        return await exec.apply(this, arguments);

    const key = JSON.stringify(Object.assign({}, this.getFilter(), { collection: this.mongooseCollection.name }));
    console.log('key', key);
    const cacheValue = await client.hget(this.hashKey, key);
    if (cacheValue) {
        const doc = JSON.parse(cacheValue);
        console.log('docs from cache');
        return Array.isArray(doc)
            ? doc.map(d => new this.model(d))
            : new this.model(doc);
    }

    // running actual query of mongoose
    const result = await exec.apply(this, arguments);
    client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
    return result;
}

module.exports = {
    clearHash(key) {
        client.del(JSON.stringify(key));
        console.log('clearing cache', key);
    }
}