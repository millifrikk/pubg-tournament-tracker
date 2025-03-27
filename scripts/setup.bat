@echo off
echo PUBG Tournament Tracker - Setup Script

echo.
echo Step 1: Starting Docker containers...
cd docker
docker-compose up -d
cd ..

echo.
echo Step 2: Installing server dependencies...
cd server
npm install

echo.
echo Step 3: Running database migrations...
npm run migrate

echo.
echo Step 4: Seeding initial data...
npm run seed

echo.
echo Step 5: Installing client dependencies...
cd ..\client
npm install

echo.
echo Setup completed successfully!
echo.
echo To start the application:
echo - Server: In the 'server' directory, run 'npm run dev'
echo - Client: In the 'client' directory, run 'npm start'
echo.
echo Server login credentials:
echo - Admin: username: admin, password: admin123
echo - User:  username: user, password: user123
echo.

pause