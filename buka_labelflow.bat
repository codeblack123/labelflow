@echo off
title LabelFlow Chrome Launcher
echo ===================================================
echo Membuka Google Chrome khusus LabelFlow (Anti-Block)
echo ===================================================

:: Cari path chrome.exe
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

:: Buka Chrome dengan flag bypass Private Network Access & CORS
start "" %CHROME_PATH% --disable-features=BlockInsecurePrivateNetworkRequests --disable-web-security --user-data-dir="%LOCALAPPDATA%\LabelFlowChrome" "https://www.labelflow.my.id"

exit
