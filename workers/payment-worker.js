'use strict';

const amqp = require('amqplib');

const {
  processPayment
} = require('../server/services/payment-service');
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
    'payment.queue',
    {
      durable: true
    }
  );

  await channel.bindQueue(
    'payment.queue',
    'order.events',
    'order.created'
  );

  channel.prefetch(1);

  console.log('Payment worker started');

  channel.consume(
    'payment.queue',
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(
          message.content.toString()
        );

        const order = event.data;

        notifyNodeRed('rabbitmq.payment.received', {
          orderId: order.id,
          queue: 'payment.queue'
        });

        const result = await executeOnce(
          'payment',
          order.id,
          async () => processPayment(order)
        );

        if (result.skipped) {
          console.log(
            `Payment worker skipped order ${order.id} because it was already completed or locked.`
          );
          notifyNodeRed('worker.payment.idempotent-skip', {
            orderId: order.id
          });
          channel.ack(message);
          notifyNodeRed('rabbitmq.payment.ack', { orderId: order.id });
          return;
        }

        console.log(
          `Payment completed for order ${order.id}`
        );
        channel.ack(message);
        notifyNodeRed('rabbitmq.payment.ack', { orderId: order.id });

      } catch (error) {
        const orderId = JSON.parse(message.content.toString()).data.id;
        const retries = await getRetryCount('payment', orderId);

        notifyNodeRed('worker.payment.failed', {
          orderId,
          error: error.message,
          retryCount: retries
        });

        console.error(
          'Payment worker error:',
          error
        );

        if (retries >= MAX_RETRIES) {
          console.error(
            `Payment worker reached max retries for order ${orderId}. Dropping message.`
          );
          channel.ack(message);
          notifyNodeRed('rabbitmq.payment.final-ack', {
            orderId,
            retryCount: retries
          });
          return;
        }

        console.log(
          `Retrying payment for order ${orderId}. Attempt ${retries + 1}/${MAX_RETRIES}`
        );

        channel.nack(
          message,
          false,
          true
        );
        notifyNodeRed('rabbitmq.payment.nack-requeue', {
          orderId,
          retryCount: retries
        });
      }
    }
  );
}

start().catch((error) => {
  console.error(
    'Payment worker failed:',
    error
  );

  process.exit(1);
});
