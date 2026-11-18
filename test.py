from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI()

class STaskAdd(BaseModel):
    name: str
    description: str | None = None


@app.get('/')
async def home():
    return {'data':'Hello world!'}


@app.post('/')
async def add_task(task: STaskAdd = Depends()):
    return {'data': task}
