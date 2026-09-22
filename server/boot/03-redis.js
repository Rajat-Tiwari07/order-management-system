'use strict';

const redis = require('../services/redis-service');

module.exports = function(app) {
  console.log('Redis boot script executed');

  app.redis = redis;
};