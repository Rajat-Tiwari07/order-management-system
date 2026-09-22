// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-workspace
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const loopback = require('loopback');
const boot = require('loopback-boot');

const app = module.exports = loopback();

app.start = function() {
  // start the web server
  const server = app.listen(function() {
    app.emit('started');
    const baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      const explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });

  if (app.nodeRedProxy) {
    server.on('upgrade', function(req, socket, head) {
      const path = req.url || '';

      if (path.startsWith('/node-red')) {
        req.url = path.replace(/^\/node-red/, '') || '/';
        app.nodeRedProxy.ws(req, socket, head, {
          target: 'http://localhost:1880'
        });
        return;
      }

      if (path.startsWith('/red')) {
        req.url = path.replace(/^\/red/, '') || '/';
        app.nodeRedProxy.ws(req, socket, head, {
          target: 'http://localhost:1880'
        });
        return;
      }

      if (path.startsWith('/comms')) {
        app.nodeRedProxy.ws(req, socket, head, {
          target: 'http://localhost:1880'
        });
      }
    });
  }

  return server;
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
