import { Telegraf } from 'telegraf'
import OpenAI from 'openai'
import { scheduleJob } from 'node-schedule'
import debug from 'debug'
import parseFictionArgs from './parseFictionArgs.js'

const log = debug('dffb')

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

const topics = [
  'ISS',
  'africa',
  'agricultural revolution',
  'agriculture',
  'ancient civilizations',
  'ancient continents',
  'ancient oceans',
  'animals',
  'antarctica',
  'antiquity',
  'ants',
  'archaeology',
  'architecture',
  'art',
  'asia',
  'asteroids',
  'astronomy',
  'atmosphere',
  'australia',
  'aviation',
  'bacteria',
  'big bang',
  'biology',
  'black holes',
  'boats',
  'catastrophies',
  'chemistry',
  'china',
  'cinema',
  'climate history',
  'clouds',
  'cognitive biases',
  'conspiracy theories',
  'cooking',
  'cosmology',
  'culture',
  'currencies',
  'deep see creatures',
  'dinosaurs',
  'discoveries',
  'earth core',
  'earth interior',
  'economics',
  'education',
  'engineering',
  'enlightening',
  'environment',
  'estimated future cosmological events',
  'estimated future geological events',
  'evolution of the human body',
  'evolution',
  'experiments',
  'extreme weather',
  'fashion',
  'films',
  'food',
  'fungi',
  'future',
  'galaxies',
  'games',
  'geography',
  'geology',
  'globalisation',
  'groundbreaking political changes',
  'groundbreaking political movements',
  'health',
  'history of education',
  'history of money',
  'history of science',
  'history',
  'human migrations',
  'hunter gatherers',
  'ice ages',
  'illusions',
  'industrial revolution',
  'internet',
  'inventions',
  'japan',
  'language',
  'limits of the human mind',
  'literature',
  'marine life',
  'mars',
  'mathematics',
  'medicine',
  'meteors',
  'microbiology',
  'microcosmos',
  'middle ages',
  'mind tricks',
  'minerals',
  'modern era',
  'music',
  'mythology',
  'nanotechnology',
  'nervous system',
  'oceans',
  'other homo spicies',
  'paganism',
  'paradoxes',
  'philosophy',
  'physics',
  'planets',
  'plants',
  'politics',
  'psychology',
  'religion',
  'renaissance',
  'revolutions',
  'rocks',
  'sailing',
  'science',
  'scientists',
  'society',
  'sociology',
  'solar system',
  'south america',
  'space travel',
  'space',
  'sport',
  'stars',
  'stone age',
  'technology',
  'tectonics',
  'television',
  'the future of the solar system',
  'the moon',
  'toys',
  'transportation',
  'trees',
  'venus',
  'viruses',
  'volcanoes',
  'wars',
  'wind',
  'wonders of the human mind',
  'world wars',
]

const styles = [
  'fun',
  'interesting',
  'educational',
  'fascinating',
  'intriguing',
  'mind-blowing',
  'unbelievable',
  'remarkable',
  'surprising',
  'less known'
]

async function linkExists(url) {
  const response = await fetch(url)

  if (response.ok) {
    log(`${url} PASS`)

    return true
  } else {
    log(`${url} FAIL`)

    return false
  }
}

async function fetchFact({ topic } = {}) {
  const { facts } = await queryLlm(({ randomTopic, randomStyle }) => {
    const chosenTopic = topic || randomTopic

    log({chosenTopic, randomStyle})

    return `
      Give me ten different bite-sized ${randomStyle} facts on ${chosenTopic}.
      Return json that looks like this: {"facts": [{ "fact": "text...", "url": "https://en.wikipedia.org/xyz" }, ...]} where fact.url is a link to the relevant Wikipedia article.
      Make sure the link exists. Keep the response under 250 characters.
    `
  })

  const randomlySortedFacts = facts.sort(() => Math.random() - 0.5)
  let fact

  for (const item of randomlySortedFacts) {
    if (await linkExists(item.url)) {
      fact = item
      break
    }
  }

  return `${fact.fact}\n\n${fact.url}`
}

async function fetchFiction({ author, topic } = {}) {
  return queryLlm(({ randomTopic }) => {
    const maybeWrittenBy = author ? ` written by ${author}` : ''
    const chosenTopic = topic || randomTopic

    log({chosenTopic, author})

    return `
      Out of five bite-sized imaginary fictional facts on ${chosenTopic} ${maybeWrittenBy} you would give me,
      give me number ${Math.ceil(Math.random() * 5)},
      but just the "fact" - no numbering or introductions. The response should not highlight the fictional nature of the "fact", it should look sufficiently plausable.
      Bonuse points for being creative, smart and funny.
      Keep the response under 250 characters.
    `
  }, { json: false })
}

async function queryLlm(promptCb, { json = true } = {}) {
  const randomTopic = topics[Math.floor(Math.random() * topics.length)]
  const randomStyle1 = styles[Math.floor(Math.random() * styles.length)]
  const randomStyle2 = styles[Math.floor(Math.random() * styles.length)]
  const randomStyle = [...new Set([randomStyle1, randomStyle2])].join(' and ')

  const messages = [
    {
      role: 'user',
      content: promptCb({ randomStyle, randomTopic })
    }
  ]

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages
    }

    if (json) {
      payload.response_format = {
        type: 'json_object'
      }
    }

    log(payload)

    const response = await openai.chat.completions.create(payload)
    const reply = json ? JSON.parse(response.choices[0].message.content) : response.choices[0].message.content

    log(reply)

    return reply
  } catch (error) {
    console.error(`OpenAI API error: ${error}`)
  }
}

async function sendDailyFact(bot) {
  const fact = await fetchFact()
  const channelIds = TELEGRAM_CHANNEL_ID.split(',')
  for (const channelId of channelIds) {
    await bot.telegram.sendMessage(channelId, fact)
  }
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

bot.use(async (ctx, next) => {
  console.time(`Processing update ${ctx.update.update_id}`)
  await next() // runs next middleware
  console.timeEnd(`Processing update ${ctx.update.update_id}`)
})

const welcomeMessage = "This is Fact Bot!\n\nCommands:\n- /fact: get a fun and educational fact. You can optionally specify a topic after /fact. E.g. '/fact space'.\n- /fiction: get a fun fictional 'fact'. Optionally arguments are 'topic:xyz' and 'author:xyz'. E.g. '/fiction author:Douglas Adams topic:Donald Trump'"
bot.command('start', async (ctx) => {
  ctx.reply(welcomeMessage)
})

bot.command('help', async (ctx) => {
  ctx.reply(welcomeMessage)
})

bot.command('fact', async (ctx) => {
  const input = ctx.message.text.split(' ')
  const topic = input.length > 1 ? input.slice(1).join(' ') : null
  await ctx.sendChatAction('typing')
  const fact = await fetchFact({ topic })
  ctx.reply(fact)
})

bot.command('fiction', async (ctx) => {
  const args = parseFictionArgs(ctx.message.text)
  await ctx.sendChatAction('typing')
  const fact = await fetchFiction(args)
  ctx.reply(fact)
})

bot.launch().then(() => {
  console.log('Bot is running')
}).catch((error) => {
  console.error('Error launching bot:', error)
})

const schedule = process.env.BOT_SCHEDULE || '0 0,12 * * *'

scheduleJob(schedule, async () => {
  try {
    await sendDailyFact(bot)
  } catch (error) {
    console.error('Error in scheduled job:', error)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
