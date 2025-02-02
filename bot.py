import os
import uuid
import asyncio
import json
import logging
import openai
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram import Update, Bot, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import Application, CommandHandler, InlineQueryHandler

# Load environment variables
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")  # Your Telegram channel ID

# Initialize OpenAI API
openai.api_key = OPENAI_API_KEY

# Load or create past facts storage
FACTS_FILE = "facts.json"
if not os.path.exists(FACTS_FILE):
    with open(FACTS_FILE, "w") as f:
        json.dump({"facts": []}, f)

def get_previous_facts():
    """Load previous facts from JSON file."""
    with open(FACTS_FILE, "r") as f:
        data = json.load(f)
    return data["facts"]

def save_fact(fact):
    """Save the new fact, ensuring only the last 100 are kept."""
    data = get_previous_facts()
    data.append(fact)
    data = data[-100:]  # Keep only the latest 100 facts

    with open(FACTS_FILE, "w") as f:
        json.dump({"facts": data}, f, indent=4)

def fetch_unique_fact():
    """Fetch a fun fact while ensuring it's not a duplicate."""
    previous_facts = get_previous_facts()
    prompt = (
        "Give me a unique, byte-sized fun fact that is not in the following list:\n" +
        "\n".join(previous_facts[-100:]) +
        "\nKeep the response under 200 characters."
    )

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        fact = response.choices[0].message.content.strip()

        if fact not in previous_facts:
            save_fact(fact)
            return fact
    except Exception as e:
        logging.error(f"OpenAI API error: {e}")
        return None

async def send_daily_fact():
    """Fetch a unique fact and send it to the Telegram channel."""
    fact = fetch_unique_fact()
    if fact:
        await bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text=f"🤖 Daily Fun Fact:\n{fact}")
    else:
        await bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text="Couldn't fetch a new fun fact today.")

# Command Handler: /fact
async def fact_command(update: Update, context):
    """Respond to /fact command with a unique fun fact."""
    fact = fetch_unique_fact()
    await update.message.reply_text(f"🤖 Fun Fact:\n{fact}")

# Handle inline queries (e.g., "@MyBot fact")
async def inline_query(update, context):
    """Respond to inline queries with a fun fact."""
    query = update.inline_query.query.strip().lower()

    if "fact" in query:  # Only respond if query contains "fact"
        fact = fetch_unique_fact()  # Fetch a new fact
        result = InlineQueryResultArticle(
            id=str(uuid.uuid4()),  # Unique ID for each response
            title="Fun Fact",
            input_message_content=InputTextMessageContent(fact)
        )
        await update.inline_query.answer([result])

logging.basicConfig(level=logging.INFO)

bot = Bot(token=TELEGRAM_BOT_TOKEN)
app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

app.add_handler(CommandHandler("fact", fact_command))
# Add InlineQueryHandler to bot
app.add_handler(InlineQueryHandler(inline_query))

scheduler = AsyncIOScheduler()
scheduler.add_job(send_daily_fact, "cron", hour=1, minute=0)

asyncio.run(app.run_polling())
scheduler.start()  # Start daily scheduling
