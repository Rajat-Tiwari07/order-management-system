'use strict';

const {
  createPayment
} = require('../repositories/payment-repository');
const { notifyNodeRed } = require('../messaging/node-red-notifier');

async function processPayment(order) {
  console.log(
    `Processing payment for order ${order.id}`
  );

  console.log(
    `Payment amount: ${order.totalAmount}`
  );

  // Simulate payment gateway processing
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  const transactionId =
    `TXN-${Date.now()}-${order.id}`;

  const payment = await createPayment({
    orderId: order.id,
    amount: order.totalAmount,
    status: 'successful',
    transactionId,
    paymentMethod: 'mock_card'
  });

  notifyNodeRed('payment.processed', {
    orderId: order.id,
    paymentId: payment.id,
    amount: order.totalAmount,
    status: 'successful',
    transactionId
  });

  console.log(
    `Payment successful for order ${order.id}`
  );

  console.log(
    `Transaction ID: ${transactionId}`
  );

  return payment;
}

module.exports = {
  processPayment
};
