# Getting Started with PUBG Tournament Tracker

This guide will help you set up and run the PUBG Tournament Tracker application on your local machine. The application consists of a React frontend, Node.js/Express backend, and PostgreSQL database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Docker](https://www.docker.com/) and Docker Compose
- [Git](https://git-scm.com/)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pubg-tournament-tracker.git
cd pubg-tournament-tracker
```

### 2. Automated Setup

We've provided scripts to automate the setup process:

#### On Windows:
```
scripts\setup.bat
```

#### On macOS/Linux:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script performs the following steps:
1. Starts Docker containers (PostgreSQL, Redis, pgAdmin)
2. Installs server dependencies
3. Runs database migrations
4. Seeds initial data
5. Installs client dependencies

### 3. Manual Setup (if automated setup fails)

#### Start Docker Containers
```bash
cd docker
docker-compose up -d
cd ..
```

#### Set Up Backend
```bash
cd server
npm install
npm run migrate
npm run seed
cd ..
```

#### Set Up Frontend
```bash
cd client
npm install
cd ..
```

## Running the Application

### Start the Backend Server

```bash
cd server
npm run dev
```

The server will run on http://localhost:5000

### Start the Frontend Development Server

In a new terminal:
```bash
cd client
npm start
```

The React app will open automatically in your browser at http://localhost:3000

## Database Management

You can access the PostgreSQL database through pgAdmin:
- URL: http://localhost:5050
- Email: admin@example.com
- Password: admin_secure_password

Once logged in, add a new server with these settings:
- Name: PUBG Tournament
- Host: pubg-tournament-db
- Port: 5432
- Username: pubgadmin
- Password: your_secure_password
- Database: pubg_tournaments

## Default User Accounts

The application is seeded with two user accounts:

### Admin User
- Username: admin
- Password: admin123
- Role: admin

### Regular User
- Username: user
- Password: user123
- Role: user

## API Endpoints

The backend provides the following main API endpoints:

- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Tournaments**: `/api/tournaments`
- **Teams**: `/api/teams`
- **Players**: `/api/players`
- **Matches**: `/api/matches/search`, `/api/matches/register`

Refer to the API documentation in the server code for more details on available endpoints and parameters.

## Common Issues and Troubleshooting

### Database Connection Issues
- Make sure Docker containers are running: `docker ps`
- Check if the PostgreSQL container is healthy: `docker logs pubg-tournament-db`
- Ensure your .env file has the correct database settings

### Frontend API Connection Issues
- Check if the server is running and accessible
- Verify the proxy setting in client/package.json is pointing to the correct API URL

### Running on Different Ports
- To change the server port, modify the PORT in server/.env
- To change the client port, you need to update the "start" script in client/package.json and the proxy setting

## Next Steps

Once you have the application running, you can:
1. Log in with the admin or user account
2. Create tournaments
3. Register teams
4. Search for and add custom matches
5. Track tournament progress