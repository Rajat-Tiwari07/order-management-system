'use strict';

const { getChannel } = require('./rabbitmq');
const { notifyNodeRed } = require('./node-red-notifier');

async function publishOrderCreated(order) {
  const channel = await getChannel();

  const event = {
    event: 'order.created',
    timestamp: new Date().toISOString(),
    data: order
  };

  channel.publish(
    'order.events',
    'order.created',
    Buffer.from(JSON.stringify(event)),
    {
      persistent: true,
      contentType: 'application/json'
    }
  );

  notifyNodeRed('rabbitmq.event.published', {
    exchange: 'order.events',
    routingKey: 'order.created',
    orderId: order.id
  });

  notifyNodeRed('order.created', order);

  console.log(
    `Published ${event.event} for order ${order.id}`
  );
}

module.exports = {
  publishOrderCreated
};