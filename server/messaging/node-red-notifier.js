'use strict';

const http = require('http');

const RED_HOST = process.env.NODE_RED_HOST || 'localhost';
const RED_PORT = Number(process.env.NODE_RED_PORT || 1880);
const RED_PATH = '/order-event';

function notifyNodeRed(eventName, payload) {
  const body = JSON.stringify({
    event: eventName,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const req = http.request({
    hostname: RED_HOST,
    port: RED_PORT,
    path: RED_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    res.resume();
  });

  req.on('error', (error) => {
    console.warn('Node-RED notifier failed:', error.message);
  });

  req.write(body);
  req.end();
}

module.exports = {
  notifyNodeRed
};
