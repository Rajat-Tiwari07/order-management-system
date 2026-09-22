'use strict';

const {
  publishOrderCreated
} = require('../messaging/publisher');
const { notifyNodeRed } = require('../messaging/node-red-notifier');

async function createOrder(
  Order,
  OrderItem,
  Product,
  Customer,
  data
 ) {
  notifyNodeRed('order.received', {
    customerId: data.customerId,
    items: data.items
  });
  // 1. Validate customer
  const customer = await Customer.findById(
    data.customerId
  );

  if (!customer) {
    const error = new Error(
      'Customer not found'
    );

    error.statusCode = 404;

    throw error;
  }


    notifyNodeRed('database.customer.validated', {
      customerId: customer.id
    });
  // 2. Validate items
  if (
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {
    const error = new Error(
      'Order must contain at least one item'
    );

    error.statusCode = 400;

    throw error;
  }

  let totalAmount = 0;

  const orderItems = [];

  // 3. Validate every product
  for (const item of data.items) {

    if (
      !item.productId ||
      !item.quantity ||
      item.quantity <= 0
    ) {
      const error = new Error(
        'Invalid productId or quantity'
      );

      error.statusCode = 400;

      throw error;
    }

    const product = await Product.findById(
      item.productId
    );

    if (!product) {
      const error = new Error(
        `Product ${item.productId} not found`
      );

      error.statusCode = 404;

      throw error;
    }

    // 4. Check stock
    if (product.stock < item.quantity) {
      const error = new Error(
        `Insufficient stock for product ${product.id}`
      );

      error.statusCode = 400;

      throw error;
    }

    const price = Number(product.price);
    const quantity = Number(item.quantity);

    const itemTotal = price * quantity;

    totalAmount += itemTotal;

    orderItems.push({
      productId: product.id,
      quantity,
      price
    });

      notifyNodeRed('database.product.validated', {
        productId: product.id,
        requestedQuantity: quantity,
        availableStock: product.stock,
        price
      });
  }

  // 5. Create order
  const order = await Order.create({
    customerId: data.customerId,
    totalAmount,
    status: 'pending'
  });

    notifyNodeRed('database.order.created', {
      id: order.id,
      customerId: order.customerId,
      totalAmount: order.totalAmount,
      status: order.status
    });

  // 6. Create order items
  for (const item of orderItems) {

    await OrderItem.create({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    });

    notifyNodeRed('database.order-item.created', {
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity
    });

  }

  // 7. Publish event
  await publishOrderCreated({
    id: order.id,
    customerId: order.customerId,
    totalAmount: order.totalAmount,
    status: order.status,
    items: orderItems
  });

  notifyNodeRed('api.order.completed', {
    orderId: order.id,
    totalAmount: order.totalAmount,
    status: order.status
  });

  return order;
}

module.exports = {
  createOrder
};