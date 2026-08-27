from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import os
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
import warnings

from app.api.merge import router as merge_router
from app.api.convert import router as convert_router
from app.api.compress import router as compress_router
from app.api.scan import router as scan_router
from app.api.split import router as split_router
from app.core.file_manager import scheduled_cleanup

warnings.filterwarnings('ignore', category=UserWarning, module='apscheduler')

app = FastAPI(title="PDF Toolkit")

# Security: CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production (e.g., ["https://yourdomain.com"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: HTTP Headers Hardening
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_cleanup, 'interval', hours=1)
scheduler.start()

app.include_router(merge_router, prefix="/api", tags=["merge"])
app.include_router(convert_router, prefix="/api", tags=["convert"])
app.include_router(compress_router, prefix="/api", tags=["compress"])
app.include_router(scan_router, prefix="/api", tags=["scan"])
app.include_router(split_router, prefix="/api", tags=["split"])

static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def redirect_to_static():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
