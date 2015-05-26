'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var slack = require('slack-notify')(process.env.SLACK_HOOK_URL);

var IMDb = require('./imdb.js');
var RottenTomatoes = require('./rottentomatoes.js');
var rt = new RottenTomatoes(process.env.RT_API_KEY);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', function (req, res) {
  var q = req.body.text;
  // Search RottenTomatoes
  rt.search(q, function(rtData) {
    if (!rtData || rtData.id === '770948116') {   // The movie with the ID 770948116 gets usually returned for wrong input
      res.status(404).send('Movie not found');
      return;
    }

    // Search IMDb
    var imdbCallback = function(imdbData) {

      // Build Slack response
      var fields = [{
        title: 'Rotten Tomatoes',
        value: '<' + rtData.links.alternate + '|' + (rtData.ratings.critics_score >= 0 ? rtData.ratings.critics_score + '%' : 'No rating') + '>',
        short: true
      }, {
        title: 'IMDb',
        value: (imdbData ? '<http://www.imdb.com/title/tt' + imdbData.imdbId + '|' + (imdbData.rating ? imdbData.rating + ' (' + imdbData.votes + ' votes)' : 'No rating') + '>' : 'Not found'),
        short: true
      }];
      if ((imdbData && imdbData.year) || rtData.year) {
        fields.push({
          title: 'Year',
          value: (imdbData && imdbData.year ? imdbData.year : rtData.year),
          short: true
        });
      }
      if ((imdbData && imdbData.runtime) || rtData.runtime) {
        fields.push({
          title: 'Runtime',
          value: (imdbData && imdbData.runtime ? imdbData.runtime : rtData.runtime + ' min'),
          short: true
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
    };

    var imdbId = (rtData.alternate_ids ? rtData.alternate_ids.imdb : null);
    if (imdbId) {
      IMDb.search(imdbId, imdbCallback);
    } else {
      imdbCallback(null);
    }
  });
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});