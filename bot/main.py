import asyncio
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from config_reader import get_config, BotConfig

bot_config = get_config(model=BotConfig, root_key='bot')

BOT_TOKEN = bot_config.BOT_TOKEN.get_secret_value()
WEBAPP_URL = "https://ваш-домен"  # URL фронтенда, пока заглушка

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[[
        types.InlineKeyboardButton(
            text="Открыть приложение",
            web_app=types.WebAppInfo(url=WEBAPP_URL)
        )
    ]])
    await message.answer("Привет! Запускай мини-апп:", reply_markup=kb)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())