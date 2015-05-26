'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var slack = require('slack-notify')(process.env.SLACK_HOOK_URL);
var when = require('when');

var Skip = require('./skip.js');
var IMDb = require('./imdb.js');
var RottenTomatoes = require('./rottentomatoes.js');
var rt = new RottenTomatoes(process.env.RT_API_KEY);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', function (req, res) {
  var q = req.body.text;

  // Fetch movie data from Rotten Tomatoes and IMDb
  var dataPromise = when.promise(function(resolve, reject) {
    rt.search(q, function(rtData) {
      if (!rtData || rtData.id === '770948116') {   // The movie with the ID 770948116 gets usually returned for wrong input
        reject();
        return;
      }

      var imdbId = (rtData.alternate_ids ? rtData.alternate_ids.imdb : null);
      if (!imdbId) {
        resolve({ 'rt': rtData, 'imdb': null });
        return;
      }

      IMDb.search(imdbId, function(imdbData) {
        resolve({ 'rt': rtData, 'imdb': imdbData });
      });
    });
  });

  // Fetch showtimes from Skip
  var skipPromise = Skip.search(q);

  // Respond to Slack
  when.all([dataPromise, skipPromise]).then(function(data) {
    var rtData = data[0].rt;
    var imdbData = data[0].imdb;
    var showtimes = data[1];

    // Build Slack response
    var fields = [{
      title: 'Rotten Tomatoes',
      value: '<' + rtData.links.alternate + '|' + (rtData.ratings.critics_score >= 0 ? rtData.ratings.critics_score + '%' : 'No rating') + '>',
      short: true
    }, {
      title: 'IMDb',
      value: (imdbData ? '<http://www.imdb.com/title/tt' + imdbData.imdbId + '|' + (imdbData.rating ? imdbData.rating + ' (' + imdbData.votes + ' votes)' : 'No rating') + '>' : 'Not found'),
      short: true
    }, {
      title: 'Year',
      value: (imdbData && imdbData.year ? imdbData.year : (rtData.year ? rtData.year : 'Unknown')),
      short: true
    }, {
      title: 'Runtime',
      value: (imdbData && imdbData.runtime ? imdbData.runtime : (rtData.runtime ? rtData.runtime + ' min' : 'Unknown')),
      short: true
    }];

    if (showtimes) {
      showtimes.forEach(function(el) {
        if (el.cinemas && el.cinemas.length) {
          var showtimesStr = '';
          el.cinemas.forEach(function(el2) {
            showtimesStr += '<' + el2.url + '|' + el2.cinema + '>: ' + el2.showtimes.join(', ') + '\n';
          });
          fields.push({
            title: el.date,
            value: showtimesStr.trim()
          });
        }
      });
    }

    // Send to Slack
    slack.send({
      username: 'moviebot',
      icon_emoji: ':movie_camera:',
      channel: req.body.channel_id,
      text: '_' + req.body.command + ' ' + req.body.text + '_',
      attachments: [{
        title: rtData.title,
        // title_link: rtData.links.alternate,
        color: '#FDEE00',
        image_url: (rtData.posters && rtData.posters.original !== 'http://d3biamo577v4eu.cloudfront.net/static/images/redesign/poster_default_thumb.gif' ? rtData.posters.original : null),
        fields: fields
      }]
    });

    res.send();
  }).catch(function(e) {
    console.log('[ERROR] ' + e);
    res.status(404).send('Movie not found');
  });
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});