from fastapi import APIRouter

from app.api.routes import auth, export, payments, reports, students


api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
