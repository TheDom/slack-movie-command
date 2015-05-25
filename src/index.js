'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var numeral = require('numeral');
var slack = require('slack-notify')(process.env.SLACK_HOOK_URL);

var imdb = require('node-movie');
var RottenTomatoes = require('./rottentomatoes.js');
var rt = new RottenTomatoes(process.env.RT_API_KEY);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', function (req, res) {
  var q = req.body.text;
  // Search RottenTomatoes
  rt.search(q, function(rtData) {
    if (!rtData) {
      res.status(404).send('Movie not found');
      return;
    }

    // Search IMDb
    var imdbCallback = function(err, imdbData) {
      if (err || !imdbData) {
        res.status(404).send('Movie not found');
        return;
      }

      // Build Slack response
      var fields = [{
        title: 'Rotten Tomatoes Rating',
        value: (rtData.ratings.critics_score ? rtData.ratings.critics_score + '%' : '_No rating_'),
        short: true
      }, {
        title: 'IMDb Rating',
        value: (imdbData.imdbRating ? imdbData.imdbRating + ' (' + numeral(imdbData.imdbVotes).format('0,0') + ' votes)' : '_No rating_'),
        short: true
      }];
      if (imdbData.Year || rtData.year) {
        fields.push({
          title: 'Year',
          value: (imdbData.Year ? imdbData.Year : rtData.year),
          short: true
        });
      }
      if (imdbData.Runtime || rtData.runtime) {
        fields.push({
          title: 'Runtime',
          value: (imdbData.Runtime ? imdbData.Runtime : rtData.runtime + ' min'),
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
          title_link: rtData.links.alternate,
          color: '#FDEE00',
          image_url: (rtData.posters ? rtData.posters.original : null),
          fields: fields
        }]
      });

      res.send();
    };

    var imdbId = (rtData.alternate_ids ? rtData.alternate_ids.imdb : null);
    if (imdbId) {
      imdb.getByID('tt' + imdbId, imdbCallback);
    } else {
      imdb(q, imdbCallback);
    }
  });
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});