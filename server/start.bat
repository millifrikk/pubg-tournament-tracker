@echo off
echo ======================================================
echo    PUBG Tournament Tracker - Server Initialization
echo ======================================================
echo.

echo [1/5] Checking for Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Node.js found!

echo [2/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies.
    echo Try running 'npm install' manually to see detailed errors.
    echo.
    pause
    exit /b 1
)
echo Dependencies installed successfully!

echo [3/5] Initializing database...
node src/db/init-db.js
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Database initialization may have encountered issues.
    echo           The server will still attempt to start.
    echo           Check the logs above for details.
    echo.
)
echo Database initialization complete!

echo [4/5] Running pre-start optimizations...
node prestart.js
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Pre-start optimizations encountered issues.
    echo           The server will still attempt to start.
    echo           Check the logs above for details.
    echo.
)
echo Pre-start optimizations complete!

echo [5/5] Starting server...
echo.
echo Server starting at http://localhost:5000
echo To stop the server, press Ctrl+C
echo.
echo ======================================================
echo.
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Server failed to start properly.
    echo Check the logs above for details.
    echo.
    pause
)
