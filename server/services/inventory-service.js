'use strict';

const {
  getProduct,
  reduceStock
} = require('../repositories/inventory-repository');
const { notifyNodeRed } = require('../messaging/node-red-notifier');

async function processInventory(order) {
  console.log(
    `Processing inventory for order ${order.id}`
  );

  for (const item of order.items) {
    const product = await getProduct(
      item.productId
    );

    if (!product) {
      throw new Error(
        `Product ${item.productId} not found`
      );
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for product ${item.productId}`
      );
    }

    const updatedProduct = await reduceStock(
      item.productId,
      item.quantity
    );

    console.log(
      `Product ${item.productId}: stock ${product.stock} -> ${updatedProduct.stock}`
    );
  }

  notifyNodeRed('inventory.updated', {
    orderId: order.id,
    items: order.items,
    status: 'updated'
  });

  console.log(
    `Inventory updated for order ${order.id}`
  );
}

module.exports = {
  processInventory
};
