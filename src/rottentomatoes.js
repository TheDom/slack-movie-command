'use strict';

var request = require('request');
var querystring = require('querystring');

var RottenTomatoes = function(apiKey) {
  this.apiKey = apiKey;
};

RottenTomatoes.prototype.search = function(name, callback) {
  var url = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=' + this.apiKey + '&q=' + querystring.escape(name) + '&page_limit=1&page=1';
  request(url, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      callback(null);
      return;
    }

    var res = JSON.parse(body);
    if (res.movies && res.movies.length) {
      callback(res.movies[0]);
    } else {
      callback(null);
    }
  });
};

module.exports = RottenTomatoes;