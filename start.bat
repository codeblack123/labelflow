@echo off
echo ====================================================
echo   Shipping Label Customizer - Local Backend
echo ====================================================
echo.
echo Starting backend server on port 8001...
echo Please do not close this window while using the web application.
echo.

uvicorn main:app --host 0.0.0.0 --port 8001

pause
