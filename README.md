# ArvyaX AI Journal System

ArvyaX is a full-stack AI journal application where users can write journal entries after a nature-inspired session, save them, analyze emotional tone with Gemini, and review personal insights over time.

## Features

- Write and save journal entries
- Select a session ambience such as forest, ocean, or mountain
- Analyze entries with Gemini to generate:
  - emotion
  - keywords
  - summary
- View past entries for a user
- View lightweight aggregated insights:
  - total entries
  - top emotion
  - favorite ambience
  - recent keywords
- React frontend with a polished single-page experience
- Express backend with SQLite persistence
- One-host deployment support using Express + built React app

## Tech Stack

### Frontend

- React
- Vite
- CSS

### Backend

- Node.js
- Express
- Axios
- dotenv

### Database

- SQLite

### AI

- Google Gemini API

## Project Structure

```text
ai-journal-system/
|- client/                    # React frontend
|  |- src/
|  |- public/
|  `- package.json
|- controllers/               # Express controllers
|- models/                    # SQLite connection and schema
|- routes/                    # API routes
|- services/                  # Gemini integration
|- server.js                  # Express server
|- journal.db                 # SQLite database
|- README.md
`- ARCHITECTURE.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-journal-system
```

### 2. Install backend dependencies

From the project root:

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 4. Create `.env`

In the project root, create a `.env` file with:

```env
GEMINI_API_KEY=your_api_key_here
PORT=5000
```

## Running the App

You need two terminals during development.

### Terminal 1: Backend

From the project root:

```bash
npm run dev
```

Expected output:

```text
Server running on http://localhost:5000
Connected to SQLite database.
```

### Terminal 2: Frontend

From `client/`:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

In development, Vite proxies `/api` requests to the Express backend.

## Production Build and One-Host Deployment

This project is configured to run on a single host in production.

In production:

- React is built into `client/dist`
- Express serves the built frontend
- API routes and frontend run from the same server

### Build for production

From the project root:

```bash
npm run build
```

This builds the frontend inside `client/` and generates `client/dist`.

### Start production server

```bash
npm start
```

The Express server will:

- serve `/api/journal/*` as backend routes
- serve the built React app for non-API routes

### Deployment Note

For one-host deployment, your platform must:

- install root dependencies
- install `client/` dependencies
- build the React app before starting the server

Also note:

- SQLite is acceptable for local/demo usage
- for reliable hosted production, PostgreSQL would be a better choice than a local SQLite file

## API Endpoints

### `POST /api/journal`

Save a journal entry and trigger AI analysis.

Request body:

```json
{
  "userId": "user123",
  "ambience": "forest",
  "text": "I felt calm and grounded after the session."
}
```

Success response:

```json
{
  "message": "Journal saved successfully",
  "id": 1,
  "emotion": "calm",
  "keywords": ["calm", "grounded", "session"],
  "summary": "The user feels peaceful and stable after their session."
}
```

### `GET /api/journal/:userId`

Fetch all journal entries for a specific user.

### `POST /api/journal/analyze`

Run standalone analysis without saving a journal entry.

Request body:

```json
{
  "text": "I feel peaceful and optimistic about the next week."
}
```

### `GET /api/journal/insights/:userId`

Fetch aggregate insights for a user.

Example response:

```json
{
  "totalEntries": 3,
  "topEmotion": "calm",
  "mostUsedAmbience": "forest",
  "recentKeywords": ["calm", "grounded", "session"]
}
```

## Frontend Flow

1. A local `userId` is generated and persisted in browser `localStorage`
2. The user writes a journal entry and selects an ambience
3. The frontend calls `POST /api/journal`
4. The backend analyzes the text with Gemini and stores the result
5. The frontend refreshes:
   - latest result card
   - past entries
   - mental state insights

## Notes and Tradeoffs

- SQLite is used for simplicity and local development speed
- Gemini analysis currently happens synchronously during save
- `userId` is demo-friendly but not a secure authentication mechanism
- This version is optimized for clarity and assignment demonstration, not final production scale

More detail is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Verification Checklist

- Backend starts successfully
- Frontend opens successfully
- Journal entries can be saved
- Gemini analysis returns emotion, keywords, and summary
- Past entries load for the same user
- Insights update after saving entries
- Postman API tests pass
- Production build generates `client/dist`
- Express serves the built frontend correctly

## Submission Files

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## Demo

- Local frontend: `http://localhost:5173` during development
- Local backend: `http://localhost:5000`
- Deployed demo: add your live link here after hosting

## Future Improvements

- deployed live demo
- caching analysis results
- rate limiting
- Docker support
- PostgreSQL for hosted production
- real authentication instead of plain `userId`
