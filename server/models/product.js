'use strict';

const redis = require('../services/redis-service');

module.exports = function(Product) {

  Product.cachedFindById = async function(id) {

    const cacheKey = `product:${id}`;

    // 1. Check Redis
    const cachedProduct = await redis.get(cacheKey);

    if (cachedProduct) {
      console.log('Redis cache HIT:', cacheKey);

      return JSON.parse(cachedProduct);
    }

    console.log('Redis cache MISS:', cacheKey);

    // 2. Get product from PostgreSQL
    const product = await Product.findById(id);

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    // 3. Store product in Redis
    await redis.set(
      cacheKey,
      JSON.stringify(product),
      'EX',
      300
    );

    console.log('Product stored in Redis:', cacheKey);

    // 4. Return product
    return product;
  };

  Product.remoteMethod('cachedFindById', {
    accepts: [
      {
        arg: 'id',
        type: 'number',
        required: true
      }
    ],

    returns: {
      arg: 'data',
      type: 'object',
      root: true
    },

    http: {
      path: '/:id/cached',
      verb: 'get'
    }
  });

};