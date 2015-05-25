'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var slack = require('slack-notify')(process.env.SLACK_HOOK_URL);

var RottenTomatoes = require('./rottentomatoes.js');
var rt = new RottenTomatoes(process.env.RT_API_KEY);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', function (req, res) {
  rt.search(req.body.text, function(rtMovie) {
    if (rtMovie === null) {
      res.status(404).send('Movie not found');
      return;
    }

    // Build Slack response
    var fields = [{
      title: 'Rotten Tomatoes Rating',
      value: (rtMovie.ratings.critics_score ? rtMovie.ratings.critics_score + '%' : '_No rating_'),
      short: true
    }];
    if (rtMovie.year) {
      fields.push({
        title: 'Year',
        value: rtMovie.year,
        short: true
      });
    }
    if (rtMovie.runtime) {
      fields.push({
        title: 'Runtime',
        value: rtMovie.runtime + ' min',
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
        title: rtMovie.title,
        title_link: rtMovie.links.alternate,
        color: '#FDEE00',
        image_url: (rtMovie.posters ? rtMovie.posters.original : null),
        fields: fields
      }]
    });

    res.send();
  });
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});