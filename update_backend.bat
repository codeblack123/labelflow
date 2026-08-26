@echo off
color 0A
title Updater Backend Label Customizer

echo ===================================================
echo   UPDATE BACKEND (main.py) LABEL CUSTOMIZER
echo ===================================================
echo.

:: Tentukan path tujuan dinamis (C:\Users\NamaUser\Documents\script)
set "TARGET_DIR=%USERPROFILE%\Documents\script"
set "SOURCE_FILE=%~dp0main.py"

:: Cek apakah file main.py ada di folder yang sama dengan script ini
if not exist "%SOURCE_FILE%" (
    echo [ERROR] File main.py tidak ditemukan!
    echo Pastikan Anda menaruh file update_backend.bat ini SATU FOLDER dengan file main.py yang baru didownload.
    echo.
    pause
    exit /b
)

:: Buat folder jika belum ada
if not exist "%TARGET_DIR%" (
    echo [INFO] Folder tujuan belum ada, sistem akan otomatis membuat folder: 
    echo %TARGET_DIR%
    mkdir "%TARGET_DIR%"
)

:: Salin dan timpa (replace) file main.py
echo [INFO] Menyalin file main.py ke %TARGET_DIR%...
copy /Y "%SOURCE_FILE%" "%TARGET_DIR%\main.py" >nul

if %errorlevel% equ 0 (
    echo.
    echo [SUKSES] File main.py berhasil di-update!
    echo Silakan tutup window ini, matikan server lokal yang sedang berjalan (jika ada), lalu jalankan ulang server (start.bat).
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat meng-copy file. Pastikan server lokal sedang DIMATIKAN sebelum melakukan update!
)

echo.
pause
