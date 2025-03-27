@echo off
echo Starting PUBG Tournament Tracker server...
echo.
echo This will initialize the database if needed and start the server.
echo.

REM Run database setup
node src/db/init-db.js

REM Start the server
npm run dev
