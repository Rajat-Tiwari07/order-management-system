'use strict';

const redis = require('./redis-service');
const { notifyNodeRed } = require('../messaging/node-red-notifier');

const MAX_RETRIES = 5;

function baseKey(workerName, orderId) {
  return `worker:${workerName}:order:${orderId}`;
}

function statusKey(workerName, orderId) {
  return `${baseKey(workerName, orderId)}:status`;
}

function retryKey(workerName, orderId) {
  return `${baseKey(workerName, orderId)}:retry`;
}

function lockKey(workerName, orderId) {
  return `${baseKey(workerName, orderId)}:lock`;
}

async function getStatus(workerName, orderId) {
  return redis.get(statusKey(workerName, orderId));
}

async function isCompleted(workerName, orderId) {
  const status = await getStatus(workerName, orderId);
  return status === 'completed';
}

async function getRetryCount(workerName, orderId) {
  const value = await redis.get(retryKey(workerName, orderId));
  return Number(value || 0);
}

async function incrementRetry(workerName, orderId) {
  const key = retryKey(workerName, orderId);
  const count = await redis.incr(key);
  await redis.expire(key, 86400);
  notifyNodeRed('redis.retry.incremented', {
    worker: workerName,
    orderId,
    retryCount: count
  });
  return count;
}

async function shouldRetry(workerName, orderId) {
  const count = await getRetryCount(workerName, orderId);
  return count < MAX_RETRIES;
}

async function acquireLock(workerName, orderId) {
  const key = lockKey(workerName, orderId);
  const result = await redis.set(key, '1', 'EX', 60, 'NX');
  notifyNodeRed(result ? 'redis.lock.acquired' : 'redis.lock.busy', {
    worker: workerName,
    orderId
  });
  return result;
}

async function releaseLock(workerName, orderId) {
  const key = lockKey(workerName, orderId);
  await redis.del(key);
}

async function setProcessing(workerName, orderId) {
  const key = statusKey(workerName, orderId);
  const result = await redis.set(key, 'processing', 'EX', 600);
  notifyNodeRed('redis.worker.processing', {
    worker: workerName,
    orderId,
    status: 'processing'
  });
  return result;
}

async function setCompleted(workerName, orderId) {
  const key = statusKey(workerName, orderId);
  await redis.set(key, 'completed', 'EX', 86400);
  await redis.del(retryKey(workerName, orderId));
  notifyNodeRed('redis.worker.completed', {
    worker: workerName,
    orderId,
    status: 'completed'
  });
}

async function setFailed(workerName, orderId, message) {
  const key = statusKey(workerName, orderId);
  await redis.set(key, `failed:${message || 'unknown'}`, 'EX', 86400);
  notifyNodeRed('redis.worker.failed', {
    worker: workerName,
    orderId,
    status: 'failed',
    error: message || 'unknown'
  });
}

async function executeOnce(workerName, orderId, callback) {
  if (await isCompleted(workerName, orderId)) {
    return {
      alreadyCompleted: true,
      skipped: true
    };
  }

  const lockAcquired = await acquireLock(workerName, orderId);

  if (!lockAcquired) {
    if (await isCompleted(workerName, orderId)) {
      return {
        alreadyCompleted: true,
        skipped: true
      };
    }

    return {
      alreadyCompleted: false,
      skipped: true
    };
  }

  try {
    await setProcessing(workerName, orderId);

    const result = await callback();

    await setCompleted(workerName, orderId);

    return {
      alreadyCompleted: false,
      skipped: false,
      result
    };
  } catch (error) {
    await setFailed(workerName, orderId, error.message || String(error));
    await incrementRetry(workerName, orderId);
    throw error;
  } finally {
    await releaseLock(workerName, orderId);
  }
}

module.exports = {
  MAX_RETRIES,
  getStatus,
  getRetryCount,
  incrementRetry,
  shouldRetry,
  isCompleted,
  executeOnce,
  setProcessing,
  setCompleted,
  setFailed
};
