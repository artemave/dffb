const { Telegraf } = require('telegraf')
const OpenAI = require('openai')
const schedule = require('node-schedule')

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

const topics = [
  'geography',
  'history',
  'science',
  'technology',
  'mathematics',
  'language',
  'art',
  'music',
  'sports',
  'food',
  'animals',
  'plants',
  'space',
  'literature',
  'mythology',
  'religion',
  'politics',
  'economics',
  'psychology',
  'philosophy',
  'education',
  'health',
  'medicine',
  'engineering',
  'architecture',
  'transportation',
  'environment',
  'society',
  'culture',
  'games',
  'fashion',
  'film',
  'television',
  'internet',
  'oceans',
  'boats',
  'planes',
  'antiquity',
  'middle ages',
  'renaissance',
  'industrial revolution',
  'modern era',
  'future',
  'ancient civilizations',
  'world wars',
  'wars',
  'revolutions',
  'inventions',
  'discoveries',
  'theories',
  'experiments',
]

const styles = [
  'fun',
  'interesting',
  'educational',
  'entertaining',
  'fascinating',
  'intriguing',
  'amazing',
  'cool',
  'awesome',
  'mind-blowing',
  'jaw-dropping',
  'unbelievable',
  'remarkable',
  'astonishing',
  'surprising',
  'stunning',
  'breathtaking',
  'wonderful',
  'marvelous',
  'incredible',
]

async function fetchUniqueFact(topic) {
  const randomTopic = topics[Math.floor(Math.random() * topics.length)]
  const randomStyle1 = styles[Math.floor(Math.random() * styles.length)]
  const randomStyle2 = styles[Math.floor(Math.random() * styles.length)]
  const randomStyle = [...new Set([randomStyle1, randomStyle2])].join(' and ')

  const messages = [
    {
      role: 'user',
      content: `Out of ten bite-sized ${randomStyle} facts on ${topic || randomTopic} you would give me, give me number ${Math.ceil(Math.random() * 10)}, but just the fact - no numbering or introductions.\nAdd a relevant Wikipedia link if you can find one (a bare link, no markdown or other formatting). Keep the response under 250 characters.`
    }
  ]

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    })

    const fact = response.choices[0].message.content

    return fact
  } catch (error) {
    console.error(`OpenAI API error: ${error}`)
  }
}

async function sendDailyFact(bot) {
  const fact = await fetchUniqueFact()
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

bot.command('start', async (ctx) => {
  const welcomeMessage = 'Welcome to Fun Fact Bot! Use the `/fact` command to get a fun and educational fact. You can optionally specify a topic after /fact. E.g., `/fact space`'
  ctx.reply(welcomeMessage)
})

bot.command('fact', async (ctx) => {
  const input = ctx.message.text.split(' ');
  const topic = input.length > 1 ? input.slice(1).join(' ') : null;
  const fact = await fetchUniqueFact(topic);
  ctx.reply(fact);
})

bot.launch().then(() => {
  console.log('Bot is running')
}).catch((error) => {
  console.error('Error launching bot:', error)
})

schedule.scheduleJob('0 0,12 * * *', async () => {
  try {
    await sendDailyFact(bot)
  } catch (error) {
    console.error('Error in scheduled job:', error)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
