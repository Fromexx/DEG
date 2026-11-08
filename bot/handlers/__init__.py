from aiogram import Router

from . import general


def get_routers() -> list[Router]:
    return [general.router]
