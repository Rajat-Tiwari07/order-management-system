'use strict';

const orderService = require('../services/order-service');

module.exports = function(Order) {

  console.log('ORDER MODEL JS LOADED');

  Order.createOrder = async function(data) {

    const OrderItem = Order.app.models.OrderItem;
    const Product = Order.app.models.Product;
    const Customer = Order.app.models.Customer;

    return orderService.createOrder(
      Order,
      OrderItem,
      Product,
      Customer,
      data
    );
  };

  Order.remoteMethod('createOrder', {
    description: 'Create a new order',

    accepts: [
      {
        arg: 'data',
        type: 'object',
        required: true,
        http: {
          source: 'body'
        }
      }
    ],

    returns: {
      arg: 'data',
      type: 'object',
      root: true
    },

    http: {
      path: '/create',
      verb: 'post'
    }
  });

};