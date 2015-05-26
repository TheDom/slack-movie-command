'use strict';

var request = require('request');
var cheerio = require('cheerio');

var IMDb = {};

IMDb.search = function(imdbId, callback) {
  var url = 'http://www.imdb.com/title/tt' + imdbId + '/';
  request(url, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      callback(null);
      return;
    }

    var $ = cheerio.load(body);
    callback({
      imdbId: imdbId,
      title: $('h1.header span.itemprop').text(),
      year: $('h1.header span.nobr a').text(),
      rating: $('span[itemprop=ratingValue]').first().text(),
      votes: $('span[itemprop=ratingCount]').first().text(),
      runtime: $('div.txt-block time[itemprop=duration]').first().text()
    });
  });
};

module.exports = IMDb;