# PUBG Tournament Tracker

A comprehensive application for managing PUBG tournaments, with special focus on custom matches. This app allows tournament organizers to create tournaments, register custom matches, track team performances, and calculate standings.

## Features

- **Tournament Management**: Create, manage, and track PUBG tournaments with various formats (points-based, elimination, round-robin)
- **Custom Match Selection**: Find and select custom matches for tournaments using various criteria
- **Team & Player Management**: Register teams and players, track their performance across tournaments
- **Match Analysis**: Detailed match statistics, telemetry analysis, and performance metrics
- **Tournament Leaderboards**: Live tournament standings with configurable scoring systems
- **User Authentication**: Secure registration and login system with role-based permissions
- **Real-time Updates**: WebSocket integration for live tournament updates
- **Advanced Visualizations**: Heatmaps, timelines, and performance charts
- **Telemetry Processing**: In-depth analysis of match telemetry data

## Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **JWT** for authentication
- **Redis** for caching
- **Docker** for containerization
- **Socket.IO** for real-time communications

### Frontend
- **React.js**
- **React Router** for navigation
- **Axios** for API requests
- **Recharts** for data visualization
- **Socket.IO Client** for real-time updates
- **Formik & Yup** for form handling and validation
- **Styled Components** for styling

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [Docker](https://www.docker.com/) and Docker Compose
- [PUBG API Key](https://developer.pubg.com/)

### Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pubg-tournament-tracker.git
   cd pubg-tournament-tracker
   ```

2. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit the .env file to add your PUBG API key and other configurations
   ```

3. **Start the PostgreSQL database using Docker**
   ```bash
   cd docker
   docker-compose up -d postgres redis
   ```

4. **Install dependencies**
   ```bash
   # Install server dependencies
   cd ../server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

5. **Run database migrations**
   ```bash
   cd ../server
   npm run migrate
   ```

6. **Start the development servers**
   ```bash
   # In one terminal, start the server
   cd server
   npm run dev

   # In another terminal, start the client
   cd client
   npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Project Structure

```
pubg-tournament-tracker/
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/                # React source code
│       ├── components/     # Reusable components
│       │   ├── common/     # Common UI components
│       │   ├── layout/     # Layout components
│       │   └── visualizations/ # Data visualization components
│       ├── contexts/       # Context providers
│       ├── pages/          # Page components
│       ├── services/       # API services
│       └── utils/          # Utility functions
├── docker/                 # Docker configuration
│   ├── init-scripts/       # PostgreSQL initialization scripts
│   └── docker-compose.yml  # Docker Compose configuration
├── server/                 # Node.js backend
│   ├── src/                # Server source code
│   │   ├── api/            # API routes
│   │   ├── config/         # Configuration files
│   │   ├── db/             # Database models & migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── socket/         # WebSocket implementation
│   │   └── utils/          # Utility functions
│   └── .env                # Environment variables (not committed)
└── docs/                   # Documentation
```

## Custom Match Integration

The PUBG API doesn't directly identify custom matches, so we implement several approaches:

1. **Match Attributes Analysis**: Analyze match data for characteristics that typically indicate custom matches (player count, game mode, map)
2. **Manual Match Registration**: Allow tournament organizers to manually register match IDs
3. **Team Verification**: Match participating teams against registered tournament teams

## Tournament Workflow

1. **Create Tournament**: Set up tournament details, format, and scoring system
2. **Register Teams**: Add teams and players to the tournament
3. **Find Custom Matches**: Search for matches by player name, date range, game mode, or map
4. **Add Matches to Tournament**: Associate matches with the tournament
5. **Calculate Standings**: Process match results and generate tournament leaderboard
6. **View Statistics**: Analyze detailed tournament and player statistics

## API Documentation

The backend API provides comprehensive endpoints for all aspects of tournament management. Key endpoints include:

- `/api/tournaments`: Tournament CRUD operations
- `/api/matches/search`: Search for potential custom matches
- `/api/matches/register`: Register a match as a tournament match
- `/api/teams`: Team management endpoints
- `/api/players`: Player search and data endpoints
- `/api/telemetry`: Access processed telemetry data
- `/api/telemetry/:matchId/heatmap`: Generate heatmap data
- `/api/telemetry/:matchId/timeline`: Get match event timeline

For full API documentation, see the [API Documentation](docs/API.md).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [PUBG Developer API](https://developer.pubg.com/)
- [PUBG API Documentation](https://documentation.pubg.com/)
