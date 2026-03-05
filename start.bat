@echo off
title Student Platform Server
echo ========================================
echo   Student Platform - Server Starting...
echo ========================================
echo.
cd /d "%~dp0"
node backend/server.js
pause
