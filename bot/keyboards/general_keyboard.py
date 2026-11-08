from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder


def start_keyboard(WEBAPP_URL) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(
            text="Открыть приложение",
            web_app=WebAppInfo(url=WEBAPP_URL)
        ))
    return kb.as_markup()
