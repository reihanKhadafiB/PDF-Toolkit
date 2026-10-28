from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextlib import asynccontextmanager
import os
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
import warnings
from app.api.merge import router as merge_router
from app.api.convert import router as convert_router
from app.api.compress import router as compress_router
from app.api.scan import router as scan_router
from app.api.split import router as split_router
from app.api.tools import router as tools_router
from app.core.file_manager import scheduled_cleanup
from app.config import MAX_REQUEST_BODY_BYTES
warnings.filterwarnings('ignore', category=UserWarning, module='apscheduler')
@asynccontextmanager
async def lifespan(app):
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)

app = FastAPI(title="PDF Toolkit", lifespan=lifespan)
class RequestSizeMiddleware:
    """Limit API upload bodies even when the client omits Content-Length."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST" or not scope["path"].startswith("/api/"):
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        too_large = JSONResponse(
            status_code=413,
            content={"detail": "Ukuran permintaan melebihi batas 50MB total unggahan."},
        )
        if content_length:
            try:
                if int(content_length) > MAX_REQUEST_BODY_BYTES:
                    await too_large(scope, receive, send)
                    return
            except ValueError:
                invalid_length = JSONResponse(status_code=400, content={"detail": "Header ukuran permintaan tidak valid."})
                await invalid_length(scope, receive, send)
                return

        received_bytes = 0

        async def limited_receive():
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > MAX_REQUEST_BODY_BYTES:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await too_large(scope, receive, send)


class RequestBodyTooLarge(Exception):
    pass

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeMiddleware)
scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_cleanup, 'interval', hours=1)
app.include_router(merge_router, prefix="/api", tags=["merge"])
app.include_router(convert_router, prefix="/api", tags=["convert"])
app.include_router(compress_router, prefix="/api", tags=["compress"])
app.include_router(scan_router, prefix="/api", tags=["scan"])
app.include_router(split_router, prefix="/api", tags=["split"])
app.include_router(tools_router, prefix="/api/tools", tags=["local tools"])
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")
@app.get("/")
def redirect_to_static():
    return RedirectResponse(url="/static/index.html")
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
