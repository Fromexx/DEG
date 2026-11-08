from aiogram import F, Router
from aiogram.filters import Command, CommandObject, Filter
from aiogram.types import Message
from Configs.WEB_CONFIG import WEB_APP
from keyboards.general_keyboard import start_keyboard

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer("Привет! Запускай мини-апп:", reply_markup=start_keyboard(WEB_APP.URL))
