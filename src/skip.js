'use strict';

var request = require('request');
var querystring = require('querystring');
var cheerio = require('cheerio');

var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var Skip = {};

Skip.search = function(name) {
  return new Promise(function(resolve, reject) {
    var url = 'http://www.skip.at/suche/?q=' + querystring.escape(name) + '&models=movies.movie';
    request(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        resolve(null);
        return;
      }

      var skipId = getMovieIdFromBody(body);
      if (!skipId) {
        resolve(null);
        return;
      }

      // Fetch showtimes for the next 7 days
      var showtimePromises = [];
      var date = new Date();
      for (var i = 0; i < 7; i++) {
        showtimePromises.push(findShowtimes(skipId, new Date(date.getTime() + i * 86400000)));
      }

      Promise.all(showtimePromises).then(function(showtimes) {
        resolve(showtimes);
      });
    });
  });
};

function getMovieIdFromBody(body) {
  var $ = cheerio.load(body);
  var link = $('.box.listing ul h2 a').first().attr('href');
  var m = (link ? link.match(/\/film\/(\d+)\/?/) : null);
  return (m && m.length >= 2 ? m[1] : null);
}

function findShowtimes(skipId, date) {
  return new Promise(function(resolve, reject) {
    var dateStr = date.toISOString().substr(0, 10);
    var url = 'http://www.skip.at/kinoprogramm/wien/filme/?filter=OF&film=' + skipId + '&datum=' + dateStr;
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
        var cinemaId = getCinemaIdFromElement($(this));
        var entry = {
          cinema: $(this).find('h4 a').text(),
          url: 'http://www.skip.at/kinoprogramm/wien/kinos/?filter=OF&kino=' + cinemaId + '&datum=' + dateStr,
          showtimes: []
        };
        $(this).find('div.times div.time').each(function(idx2, el2) {
          entry.showtimes.push(getShowtimeFromElement($(this), $));
        });
        data.cinemas.push(entry);
      });

      resolve(data);
    });
  });
}

function getCinemaIdFromElement(el) {
  var cinemaLink = el.find('h4 a').attr('href');
  var m = (cinemaLink ? cinemaLink.match(/\/kino\/(\d+)\/?/) : null);
  return (m && m.length >= 2 ? m[1] : null);
}

function getShowtimeFromElement(el, $) {
  var meta = [];
  el.find('span.additional').each(function(idx, el) {
    var text = $(this).text().replace('digital', '').trim();
    if (text) {
      meta.push(text);
    }
    $(this).text('');
  });
  return el.text().trim().replace('.', ':') + (meta.length ? ' (' + meta.join(' ') + ')' : '');
}

module.exports = Skip;