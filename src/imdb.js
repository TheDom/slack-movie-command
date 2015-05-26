var http = require('http');
var cheerio = require('cheerio');

var IMDb = {};

IMDb.search = function(imdbId, callback) {
  var reqOptions = {
    host: 'www.imdb.com',
    path: '/title/tt' + imdbId + '/'
  };

  var reqCallback = function(response) {
    var str = '';
    response.on('data', function(chunk) { str += chunk; });
    response.on('error', function(e) { callback(null); });
    response.on('end', function() {
      var $ = cheerio.load(str);

      callback({
        imdbId: imdbId,
        title: $('h1.header span.itemprop').text(),
        year: $('h1.header span.nobr a').text(),
        rating: $('span[itemprop=ratingValue]').text(),
        votes: $('span[itemprop=ratingCount]').text(),
        runtime: $('div.txt-block time[itemprop=duration]').text()
      });
    });
  };

  http.request(reqOptions, reqCallback).end();
};

module.exports = IMDb;