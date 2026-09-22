'use strict';

const db = require('../services/postgres-service');

async function createPayment({
  orderId,
  amount,
  status,
  transactionId,
  paymentMethod
}) {
  const query = `
    INSERT INTO payment
      (
        orderid,
        amount,
        status,
        transactionid,
        paymentmethod
      )
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    orderId,
    amount,
    status,
    transactionId,
    paymentMethod
  ];

  const result = await db.query(
    query,
    values
  );

  return result.rows[0];
}

module.exports = {
  createPayment
};
