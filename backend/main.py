import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from engine import Airport

# One local session. Snapshot on every reconnect; logical time is engine-owned.
airport = Airport()
lock = asyncio.Lock()

@asynccontextmanager
async def lifespan(app):
    async def clock():
        while True:
            await asyncio.sleep(.1)
            async with lock:
                airport.tick()
    task = asyncio.create_task(clock())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title='Lost in Transit', lifespan=lifespan)

class Command(BaseModel):
    action: str
    value: object = None

@app.get('/api/state')
def state():
    return airport.view()

@app.post('/api/command')
async def command(body: Command):
    async with lock:
        try:
            airport.command(body.action, body.value)
        except (ValueError, TypeError, IndexError) as error:
            raise HTTPException(400, str(error)) from error
        return airport.view()

@app.websocket('/ws')
async def stream(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_json(airport.view())
            await asyncio.sleep(.15)
    except (WebSocketDisconnect, RuntimeError):
        pass

# Production mode serves the bundled frontend from the same local origin.
from pathlib import Path
from fastapi.staticfiles import StaticFiles
frontend = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'
if frontend.is_dir():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
