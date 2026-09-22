'use strict';

module.exports = function(app) {

  const ds = app.dataSources.db;

  ds.autoupdate(function(err) {
    if (err) {
      console.error('Database migration failed:', err);
      throw err;
    }

    console.log('Database tables updated successfully.');
  });

};