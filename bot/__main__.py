import asyncio
import logging
import sys
import os
from aiogram import Bot, Dispatcher
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Configs.config_reader import get_config, BotConfig
from handlers import get_routers

bot_config = get_config(model=BotConfig, root_key='bot')

BOT_TOKEN = bot_config.token.get_secret_value()

dp = Dispatcher()
for router in get_routers():
    dp.include_router(router)


async def main():
    bot = Bot(BOT_TOKEN)
    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    asyncio.run(main())
