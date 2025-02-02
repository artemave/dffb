import os
import asyncio
import json
import logging
import openai
# from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from telegram import Bot

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

# Set up logging
logging.basicConfig(level=logging.INFO)
bot = Bot(token=TELEGRAM_BOT_TOKEN)

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

# asyncio.run(send_daily_fact())

# Scheduler for daily posting
# scheduler = BackgroundScheduler()
scheduler = BlockingScheduler()
scheduler.add_job(send_daily_fact, "cron", hour=1, minute=0)  # Adjust time as needed
scheduler.start()
