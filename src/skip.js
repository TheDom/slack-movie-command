'use strict';

var when = require('when');
var request = require('request');
var querystring = require('querystring');
var cheerio = require('cheerio');

var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var Skip = {};

Skip.search = function(name) {
  return when.promise(function(resolve, reject) {
    request('http://www.skip.at/suche/?q=' + querystring.escape(name), function(error, response, body) {
      if (error || response.statusCode !== 200) {
        resolve(null);
        return;
      }

      var skipId = getSkipMovieIdFromBody(body);
      if (!skipId) {
        resolve(null);
        return;
      }

      // Fetch showtimes for the next 7 days
      var showtimePromises = [];
      var d = new Date();
      for (var i = 0; i < 7; i++) {
        showtimePromises.push(findShowtimes(skipId, d));
        d.setDate(d.getDate() + 1);
      }

      when.all(showtimePromises).then(function(showtimes) {
        resolve(showtimes);
      });
    });
  });
};

function getSkipMovieIdFromBody(body) {
  var $ = cheerio.load(body);
  var link = $('.box.listing ul h2 a').first().attr('href');
  var m = (link ? link.match(/\/film\/(\d+)\/?/) : null);
  return (m && m.length >= 2 ? m[1] : null);
}

function findShowtimes(skipId, date) {
  return when.promise(function(resolve, reject) {
    var url = 'http://www.skip.at/kinoprogramm/wien/filme/?filter=OF&film=' + skipId + '&datum=' + date.toISOString().substr(0, 10);
    request(url, function(error, response, body) {
      var data = {
        date: weekdays[date.getDay()] + ', ' + date.toISOString().substr(5, 5),
        cinemas: []
      };

      if (error || response.statusCode !== 200) {
        resolve(data);
        return;
      }

      var $ = cheerio.load(body);
      $('ul.schedule-listing li').each(function(idx, el) {
        var cinemaLink = $(this).find('h4 a').attr('href');
        var m = (cinemaLink ? cinemaLink.match(/\/kino\/(\d+)\/?/) : null);
        var cinemaId = (m && m.length >= 2 ? m[1] : null);
        var entry = {
          cinema: $(this).find('h4 a').text(),
          url: 'http://www.skip.at/kinoprogramm/wien/kinos/?filter=OF&kino=' + cinemaId + '&datum=' + date,
          showtimes: []
        };
        $(this).find('div.times div.time').each(function(idx2, el2) {
          var meta = [];
          $(this).find('span.additional').each(function(idx3, el3) {
            meta.push($(this).text());
            $(this).text('');
          });
          var showtime = $(this).text().trim().replace('.', ':') + (meta.length ? ' (' + meta.join(' ') + ')' : '');
          entry.showtimes.push(showtime);
        });
        data.cinemas.push(entry);
      });

      resolve(data);
    });
  });
}

module.exports = Skip;