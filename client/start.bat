@echo off
echo ======================================================
echo    PUBG Tournament Tracker - Client Initialization
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

echo [2/5] Checking server availability...
curl -s http://localhost:5000/api/status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Backend server doesn't appear to be running at http://localhost:5000
    echo          You may encounter API errors if you continue.
    echo.
    choice /C YN /M "Do you want to continue anyway?"
    if %ERRORLEVEL% EQU 2 (
        echo Startup canceled. Please start the server first using server\start.bat
        pause
        exit /b 1
    )
)

echo [3/5] Installing core dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install core dependencies.
    echo Try running 'npm install' manually to see detailed errors.
    echo.
    pause
    exit /b 1
)
echo Core dependencies installed successfully!

echo [4/5] Installing Tailwind CSS and related packages...
call npm install tailwindcss postcss autoprefixer --save
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install Tailwind CSS dependencies.
    echo          The application will still start but may not have the dark theme.
    echo.
)
echo Tailwind CSS dependencies installed!

echo [5/5] Starting development server...
echo.
echo Client starting at http://localhost:3000
echo To stop the server, press Ctrl+C
echo.
echo ======================================================
echo.
call npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Development server failed to start properly.
    echo Check the logs above for details.
    echo.
    pause
)
