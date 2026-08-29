@echo off
color 0A
title Updater Backend Label Customizer

echo ===================================================
echo   UPDATE BACKEND (main.py) LABEL CUSTOMIZER
echo ===================================================
echo.

:: Otomatis matikan proses server lama di port 8001 jika masih berjalan
echo [INFO] Memeriksa dan mematikan server backend lama (port 8001)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: Tentukan path tujuan dinamis (C:\Users\NamaUser\Documents\script)
set "TARGET_DIR=%USERPROFILE%\Documents\script"

:: Cari file main*.py terbaru di folder Downloads menggunakan PowerShell
echo [INFO] Mencari file main.py terbaru di folder Downloads Anda...
for /f "delims=" %%I in ('powershell -NoProfile -Command "Get-ChildItem -Path '%USERPROFILE%\Downloads\main*.py' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { $_.FullName }"') do set "LATEST_FILE=%%I"

if "%LATEST_FILE%"=="" (
    echo.
    echo [ERROR] Tidak ditemukan file main.py di folder Downloads!
    echo Pastikan Anda sudah mengklik Langkah 2 untuk men-download file main.py.
    echo.
    pause
    exit /b
)

echo [INFO] Ditemukan file update terbaru: 
echo        "%LATEST_FILE%"
echo.

:: Buat folder tujuan jika belum ada
if not exist "%TARGET_DIR%" (
    echo [INFO] Membuat folder tujuan: %TARGET_DIR%
    mkdir "%TARGET_DIR%"
)

:: Salin dan timpa (replace) file main.py ke folder tujuan
echo [INFO] Menyalin file ke %TARGET_DIR%\main.py...
copy /Y "%LATEST_FILE%" "%TARGET_DIR%\main.py" >nul

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo  [SUKSES] File main.py BERHASIL DI-UPDATE!
    echo ===================================================
    echo.
    echo Langkah selanjutnya:
    echo 1. Anda boleh menutup jendela ini.
    echo 2. Buka / jalankan kembali file start.bat (server backend).
    echo 3. Pop-up di web browser akan otomatis tertutup sendiri!
    echo.
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat meng-copy file.
    echo Silakan pastikan jendela CMD server lama sudah ditutup (klik tombol X di CMD).
    echo.
)

pause

