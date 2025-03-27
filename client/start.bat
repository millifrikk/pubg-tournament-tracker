@echo off
echo Starting PUBG Tournament Tracker Frontend...
echo.
echo If you haven't started the backend server yet, please run the start.bat file in the server directory first.
echo.
echo Server: http://localhost:5000 (backend API)
echo Client: http://localhost:3000 (frontend)
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Set current directory explicitly
cd /d "%~dp0"

:: Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Start the client
echo Starting client application...
call npm start

:: Keep the window open if there's an error
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to start client application.
    pause
    exit /b 1
)

pause
