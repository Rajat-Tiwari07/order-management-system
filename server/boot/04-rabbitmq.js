'use strict';

const {
  connectRabbitMQ
} = require('../messaging/rabbitmq');

module.exports = async function(app) {
  try {
    await connectRabbitMQ();

    console.log('RabbitMQ boot completed');
  } catch (error) {
    console.error(
      'RabbitMQ connection failed:',
      error
    );

    throw error;
  }
};