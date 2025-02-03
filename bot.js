const fs = require('fs')
const { Telegraf } = require('telegraf')
const OpenAI = require('openai')
const schedule = require('node-schedule')

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

// Load or create past facts storage
const FACTS_FILE = 'facts.json'
if (!fs.existsSync(FACTS_FILE)) {
  fs.writeFileSync(FACTS_FILE, JSON.stringify({ facts: [] }, null, 4))
}

function getPreviousFacts() {
  const data = JSON.parse(fs.readFileSync(FACTS_FILE, 'utf8'))
  return data.facts
}

function saveFact(fact) {
  let data = getPreviousFacts()
  data.push(fact)
  fs.writeFileSync(FACTS_FILE, JSON.stringify({ facts: data.slice(-200) }, null, 4))
}

async function fetchUniqueFact() {
  const previousFacts = getPreviousFacts()
  const messages = [
    {
      role: 'user',
      content: `Give me a bite-sized fun and educational fact that is not in the following list:\n${previousFacts.join('\n')}\n\nAdd a relevant Wikipedia link if you can find one (a bare link, no markdown or other formatting). Keep the response under 250 characters.`
    }
  ]

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    })

    const fact = response.choices[0].message.content

    if (!previousFacts.includes(fact)) {
      saveFact(fact)
      return fact
    } else {
      return fetchUniqueFact()
    }
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

bot.command('fact', async (ctx) => {
  const fact = await fetchUniqueFact()
  ctx.reply(fact)
})

bot.on('inline_query', async (ctx) => {
  const fact = await fetchUniqueFact()
  const results = [
    {
      type: 'article',
      id: String(Math.random()), // Unique identifier for this result
      title: 'Fun Fact',
      input_message_content: {
        message_text: fact
      }
    }
  ]
  await ctx.answerInlineQuery(results, { cache_time: 0 })
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
