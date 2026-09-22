'use strict';

const db = require('../services/postgres-service');

async function getProduct(productId) {
  const query = `
    SELECT *
    FROM product
    WHERE id = $1;
  `;

  const result = await db.query(query, [productId]);

  return result.rows[0];
}

async function reduceStock(productId, quantity) {
  const query = `
    UPDATE product
    SET stock = stock - $1
    WHERE id = $2
    RETURNING *;
  `;

  const result = await db.query(
    query,
    [quantity, productId]
  );

  return result.rows[0];
}

module.exports = {
  getProduct,
  reduceStock
};
