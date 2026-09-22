'use strict';

const amqp = require('amqplib');

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(
    process.env.RABBITMQ_URL || 'amqp://localhost'
  );

  channel = await connection.createChannel();

  await channel.assertExchange('order.events', 'topic', {
    durable: true
  });

  console.log('RabbitMQ connected');

  connection.on('error', (error) => {
    console.error('RabbitMQ connection error:', error);
  });

  connection.on('close', () => {
    console.log('RabbitMQ connection closed');
    connection = null;
    channel = null;
  });

  return channel;
}

async function getChannel() {
  if (!channel) {
    return connectRabbitMQ();
  }

  return channel;
}

module.exports = {
  connectRabbitMQ,
  getChannel
};