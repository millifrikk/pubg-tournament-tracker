@echo off
echo Stopping containers...
cd docker
docker-compose down

echo Removing database volumes...
docker volume rm docker_postgres_data

echo Starting containers...
docker-compose up -d

echo Waiting for database to initialize (15 seconds)...
timeout /t 15

echo Running database migrations...
cd ../server
npm run migrate

echo Done! The database should now be properly configured.
echo You can restart the server with: npm run dev
