'use strict';

const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:1880',
  changeOrigin: true,
  ws: true
});

proxy.on('error', (error) => {
  console.warn('Node-RED proxy error:', error.message);
});

module.exports = function(app) {
  app.nodeRedProxy = proxy;

  app.use('/node-red', (req, res) => {
    if (req.originalUrl === '/node-red') {
      res.redirect('/node-red/');
      return;
    }

    proxy.web(req, res, { target: 'http://localhost:1880' });
  });

  app.use('/red', (req, res) => {
    if (req.originalUrl === '/red') {
      res.redirect('/red/');
      return;
    }

    proxy.web(req, res, { target: 'http://localhost:1880' });
  });

};
