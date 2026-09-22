'use strict';

const amqp = require('amqplib');

const {
  processInventory
} = require('../server/services/inventory-service');
const {
  executeOnce,
  getRetryCount,
  MAX_RETRIES
} = require('../server/services/worker-state');
const { notifyNodeRed } = require('../server/messaging/node-red-notifier');

async function start() {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL || 'amqp://localhost'
  );

  const channel = await connection.createChannel();

  await channel.assertExchange(
    'order.events',
    'topic',
    {
      durable: true
    }
  );

  await channel.assertQueue(
    'inventory.queue',
    {
      durable: true
    }
  );

  await channel.bindQueue(
    'inventory.queue',
    'order.events',
    'order.created'
  );

  channel.prefetch(1);

  console.log('Inventory worker started');

  channel.consume(
    'inventory.queue',
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(
          message.content.toString()
        );

        const order = event.data;

        notifyNodeRed('rabbitmq.inventory.received', {
          orderId: order.id,
          queue: 'inventory.queue'
        });

        const result = await executeOnce(
          'inventory',
          order.id,
          async () => processInventory(order)
        );

        if (result.skipped) {
          console.log(
            `Inventory worker skipped order ${order.id} because it was already completed or locked.`
          );
          notifyNodeRed('worker.inventory.idempotent-skip', {
            orderId: order.id
          });
          channel.ack(message);
          notifyNodeRed('rabbitmq.inventory.ack', { orderId: order.id });
          return;
        }

        console.log(
          `Inventory updated for order ${order.id}`
        );
        channel.ack(message);
        notifyNodeRed('rabbitmq.inventory.ack', { orderId: order.id });

      } catch (error) {
        const orderId = JSON.parse(message.content.toString()).data.id;
        const retries = await getRetryCount('inventory', orderId);

        notifyNodeRed('worker.inventory.failed', {
          orderId,
          error: error.message,
          retryCount: retries
        });

        console.error(
          'Inventory worker error:',
          error
        );

        if (retries >= MAX_RETRIES) {
          console.error(
            `Inventory worker reached max retries for order ${orderId}. Dropping message.`
          );
          channel.ack(message);
          notifyNodeRed('rabbitmq.inventory.final-ack', {
            orderId,
            retryCount: retries
          });
          return;
        }

        console.log(
          `Retrying inventory for order ${orderId}. Attempt ${retries + 1}/${MAX_RETRIES}`
        );

        channel.nack(
          message,
          false,
          true
        );
        notifyNodeRed('rabbitmq.inventory.nack-requeue', {
          orderId,
          retryCount: retries
        });
      }
    }
  );
}

start().catch((error) => {
  console.error(
    'Inventory worker failed:',
    error
  );

  process.exit(1);
});
