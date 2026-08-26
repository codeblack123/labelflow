@echo off
color 0A
title Updater Backend Label Customizer

echo ===================================================
echo   UPDATE BACKEND (main.py) LABEL CUSTOMIZER
echo ===================================================
echo.

:: Tentukan path tujuan dinamis (C:\Users\NamaUser\Documents\script)
set "TARGET_DIR=%USERPROFILE%\Documents\script"

:: Cari file main*.py terbaru di folder Downloads menggunakan PowerShell
echo [INFO] Mencari file main.py terbaru di folder Downloads Anda...
for /f "delims=" %%I in ('powershell -NoProfile -Command "Get-ChildItem -Path '%USERPROFILE%\Downloads\main*.py' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { $_.FullName }"') do set "LATEST_FILE=%%I"

if "%LATEST_FILE%"=="" (
    echo [ERROR] Tidak ditemukan file main.py (atau variannya seperti main ^(1^).py) di folder Downloads!
    echo Pastikan Anda sudah men-download file update dari link Google Drive.
    echo.
    pause
    exit /b
)

echo [INFO] Ditemukan file update: "%LATEST_FILE%"

:: Buat folder tujuan jika belum ada
if not exist "%TARGET_DIR%" (
    echo [INFO] Folder tujuan belum ada, sistem membuat folder: 
    echo %TARGET_DIR%
    mkdir "%TARGET_DIR%"
)

:: Salin dan timpa (replace) file main.py ke folder tujuan
echo [INFO] Menyalin dan menimpa file lama di %TARGET_DIR%\main.py...
copy /Y "%LATEST_FILE%" "%TARGET_DIR%\main.py" >nul

if %errorlevel% equ 0 (
    echo.
    echo [SUKSES] File main.py berhasil di-update dari %LATEST_FILE%!
    echo Silakan tutup window ini, MATIKAN server lokal yang lama (jika masih jalan), lalu jalankan ulang server.
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat meng-copy file. Pastikan server lokal sedang DIMATIKAN sebelum melakukan update!
)

echo.
pause
