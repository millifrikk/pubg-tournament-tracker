@echo off
echo Running database migrations...

:: Change to the script directory
cd /d "%~dp0"

:: Run the migration script
node src/db/runMigrations.js

pause