var http = require('http');

var RottenTomatoes = function(apiKey) {
  this.apiKey = apiKey;
};

RottenTomatoes.prototype.search = function(name, callback) {
  var reqOptions = {
    host: 'api.rottentomatoes.com',
    path: '/api/public/v1.0/movies.json?apikey=' + this.apiKey + '&q=' + name + '&page_limit=1&page=1'
  };

  var reqCallback = function(response) {
    var str = '';
    response.on('data', function(chunk) { str += chunk; });
    response.on('error', function(e) { callback(null); });
    response.on('end', function() {
      var res = JSON.parse(str);
      if (res.movies && res.movies.length) {
        callback(res.movies[0]);
      } else {
        callback(null);
      }
    });
  };

  http.request(reqOptions, reqCallback).end();
};

module.exports = RottenTomatoes;