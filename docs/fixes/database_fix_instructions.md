# Database Connection Fix Instructions

I've made the following changes to fix the database connection issue:

## 1. Updated Environment Configuration
- Modified `.env` file to use port `5433` instead of `5432` to match your Docker setup
- The PostgreSQL container is correctly mapping port 5432 inside the container to port 5433 on your host

## 2. Enhanced Database Initialization
- Added a new initialization script `00-create-user.sql` that ensures the `pubgadmin` user exists
- Modified Docker Compose file to add `POSTGRES_HOST_AUTH_METHOD: trust` to simplify authentication during setup

## 3. Created Database Reset Script
- Added `reset-database.bat` which:
  - Stops all containers
  - Removes the PostgreSQL volume to start fresh
  - Restarts containers
  - Runs the migrations

## Next Steps

### Option 1: Run the Reset Script
```bash
# Navigate to the project root
cd C:\Users\emil\OneDrive\Documents\development\apiDevelopment\pubg-tournament-tracker
# Run the reset script
.\reset-database.bat
```

### Option 2: Manual Steps
If you prefer to do this manually:

1. Stop containers:
```bash
cd C:\Users\emil\OneDrive\Documents\development\apiDevelopment\pubg-tournament-tracker\docker
docker-compose down
```

2. Remove postgres volume:
```bash
docker volume rm docker_postgres_data
```

3. Start containers:
```bash
docker-compose up -d
```

4. Wait 15-20 seconds for the database to initialize

5. Run migrations:
```bash
cd ../server
npm run migrate
```

6. Start the server:
```bash
npm run dev
```

After these steps, try registering again and the error should be resolved.

## Troubleshooting

If you still encounter issues:

1. Check if the PostgreSQL container is running:
```bash
docker ps
```

2. Check the PostgreSQL logs:
```bash
docker logs pubg-tournament-db
```

3. Try connecting to the database directly:
```bash
docker exec -it pubg-tournament-db psql -U pubgadmin -d pubg_tournaments
```

4. Check server logs for specific errors when trying to register.
