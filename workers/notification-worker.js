'use strict';

const amqp = require('amqplib');

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
    'notification.queue',
    {
      durable: true
    }
  );

  await channel.bindQueue(
    'notification.queue',
    'order.events',
    'order.created'
  );

  channel.prefetch(1);

  console.log('Notification worker started');

  channel.consume(
    'notification.queue',
    async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(
          message.content.toString()
        );

        const order = event.data;

        notifyNodeRed('rabbitmq.notification.received', {
          orderId: order.id,
          queue: 'notification.queue'
        });

        const result = await executeOnce(
          'notification',
          order.id,
          async () => {
            console.log(
              `Sending notification for order ${order.id}`
            );

            console.log(
              `Customer: ${order.customerId}`
            );

            console.log(
              `Order amount: ${order.totalAmount}`
            );

            await new Promise((resolve) => {
              setTimeout(resolve, 300);
            });

            notifyNodeRed('notification.sent', {
              orderId: order.id,
              customerId: order.customerId,
              totalAmount: order.totalAmount,
              status: 'sent'
            });

            console.log(
              `Notification sent for order ${order.id}`
            );
          }
        );

        if (result.skipped) {
          console.log(
            `Notification worker skipped order ${order.id} because it was already completed or locked.`
          );
          notifyNodeRed('worker.notification.idempotent-skip', {
            orderId: order.id
          });
          channel.ack(message);
          notifyNodeRed('rabbitmq.notification.ack', { orderId: order.id });
          return;
        }

        channel.ack(message);
        notifyNodeRed('rabbitmq.notification.ack', { orderId: order.id });

      } catch (error) {
        const orderId = JSON.parse(message.content.toString()).data.id;
        const retries = await getRetryCount('notification', orderId);

        notifyNodeRed('notification.failed', {
          orderId,
          error: error.message,
          retryCount: retries
        });

        notifyNodeRed('worker.notification.failed', {
          orderId,
          error: error.message,
          retryCount: retries
        });

        console.error(
          'Notification worker error:',
          error
        );

        if (retries >= MAX_RETRIES) {
          console.error(
            `Notification worker reached max retries for order ${orderId}. Dropping message.`
          );
          channel.ack(message);
          notifyNodeRed('rabbitmq.notification.final-ack', {
            orderId,
            retryCount: retries
          });
          return;
        }

        console.log(
          `Retrying notification for order ${orderId}. Attempt ${retries + 1}/${MAX_RETRIES}`
        );

        channel.nack(
          message,
          false,
          true
        );
        notifyNodeRed('rabbitmq.notification.nack-requeue', {
          orderId,
          retryCount: retries
        });
      }
    }
  );
}

start().catch((error) => {
  console.error(
    'Notification worker failed:',
    error
  );

  process.exit(1);
});
