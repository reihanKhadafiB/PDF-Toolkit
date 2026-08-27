from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
import warnings

from app.api.merge import router as merge_router
from app.api.convert import router as convert_router
from app.core.file_manager import scheduled_cleanup

warnings.filterwarnings('ignore', category=UserWarning, module='apscheduler')

app = FastAPI(title="PDF Toolkit")

scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_cleanup, 'interval', hours=1)
scheduler.start()

app.include_router(merge_router, prefix="/api", tags=["merge"])
app.include_router(convert_router, prefix="/api", tags=["convert"])

static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def redirect_to_static():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
