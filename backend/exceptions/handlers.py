"""全局异常处理器"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from schemas.common import ErrorResponse, ErrorCodes


def _make_http_response(exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=exc.status_code * 10,
            message=exc.detail,
        ).model_dump(exclude_none=True),
    )


def register_exception_handlers(app: FastAPI):
    """注册全局异常处理器"""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return _make_http_response(exc)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        detail = "; ".join(f"{e['loc'][-1]}: {e['msg']}" for e in errors)
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                code=ErrorCodes.BAD_REQUEST,
                message=detail,
            ).model_dump(exclude_none=True),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                code=ErrorCodes.SERVER_ERROR,
                message="服务器内部错误",
            ).model_dump(exclude_none=True),
        )
