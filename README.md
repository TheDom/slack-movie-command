# slack-movie-command

This [Node.js](https://nodejs.org) project implements a [Slash Command](https://api.slack.com/slash-commands) for [Slack](https://slack.com). Replies are implemented as an [Incoming Webhook](https://api.slack.com/incoming-webhooks).

Users can type `/movie <name>` to retrieve a movie's ratings from [Rotten Tomatoes](http://www.rottentomatoes.com) and [IMDb](http://www.imdb.com) as well as upcoming original version showtimes in Vienna, Austria.

To deploy this application set the `SLACK_HOOK_URL` and `RT_API_KEY` environment variables. Optionally the `PORT` can also be defined.