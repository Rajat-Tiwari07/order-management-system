'use strict';

const redis = require('./redis-service');

async function testRedis() {
  await redis.set('learning:name', 'Rajat');

  const value = await redis.get('learning:name');

  console.log('Value from Redis:', value);

  await redis.del('learning:name');

  await redis.quit();
}

testRedis().catch((err) => {
  console.error('Redis test failed:', err);
});