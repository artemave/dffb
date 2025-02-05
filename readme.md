# daily fun fact bot

A Telegram bot that periodically posts fun and educational facts to a channel/group. It can also be quizzed directly via `/fact` command.

## Setup

Requires `nodejs`. Install dependencies:

`npm install`

### Environment

The bot expects the following variables:

    export TELEGRAM_BOT_TOKEN=*****
    export TELEGRAM_CHANNEL_ID=****
    export OPENAI_API_KEY=*****

To obtain `TELEGRAM_BOT_TOKEN` create via `@BotFather`.

To obtain `TELEGRAM_CHANNEL_ID` (or multiple, comma separated channel/group ids), create a channel, then navigate to `https://web.telegram.org/z/#-1543515057`, open the channel and copy the id from the url.

Now you can run it:

`npm start`

Run tests:

`npm test`
