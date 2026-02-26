# F1 Undercut Strategy Simulator

A full-stack tool for analyzing the viability of pit-stop undercut strategies in Formula 1 using real telemetry data from the [OpenF1 API](https://openf1.org).

Pick any race from 2023 onwards, select two drivers, and scrub through the race lap-by-lap to see how the undercut probability evolves in real time.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## How It Works

An **undercut** is when a trailing driver ("Chaser") pits earlier than the car ahead ("Leader") to gain a position through the pace advantage of fresh tires.

The simulator evaluates undercut viability using this model:

```
margin = (response_laps × tyre_advantage_per_lap) − gap
```

- **Tyre advantage** is measured empirically from actual pit stops in the session — comparing each driver's pace before and after their stops.
- **Response laps** is the number of laps the Leader takes to respond (default: 2).
- **Gap** is the live interval between the two cars at the selected lap.

A positive margin means the undercut is likely to succeed. The probability gauge maps the margin to a 0–100% scale.

## Features

- **Historical race analysis** — Browse any race from 2023–present by year, meeting, and session
- **Lap-by-lap scrubbing** — Slide through the race and watch the undercut probability change
- **Live position data** — Drivers are sorted by race position at the selected lap so you know who's actually ahead
- **Interactive charts** — Lap times, gap history, stint timelines, and weather data via Plotly.js
- **Undercut probability gauge** — Visual indicator that turns from red to green as the undercut becomes viable
- **Undercut window flag** — Highlights when the gap drops below 1.5s

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, pandas, httpx |
| Frontend | React 18, TypeScript, Vite, Plotly.js, TailwindCSS |
| Data | OpenF1 API (no auth required) |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API runs at `http://localhost:8000`. Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/meetings?year=2024` | List race weekends for a season |
| `GET /api/sessions?meeting_key=...` | List sessions (FP1, Quali, Race) |
| `GET /api/drivers?session_key=...` | List drivers in a session |
| `GET /api/positions?session_key=...&lap=15` | Driver positions at a given lap |
| `GET /api/strategy/evaluate?session_key=...&leader=1&chaser=4&lap=20` | Run undercut analysis |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Vite dev server proxies `/api` requests to the backend.

### Usage

1. Select a **year** and **race weekend**
2. Choose the **Race** session
3. Pick a **Leader** (car ahead) and **Chaser** (car behind) — drivers are sorted by position
4. Click **Analyze Undercut**
5. Use the **lap slider** to scrub through the race and watch the undercut probability evolve

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI routes
│   │   ├── models.py            # Pydantic response models
│   │   ├── openf1_client.py     # Async HTTP client with caching & retries
│   │   ├── session_manager.py   # Meeting/session/driver resolution
│   │   └── strategy_engine.py   # Core undercut math & evaluation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # API client
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # Main results layout
│   │   │   ├── DriverSelector.tsx# Driver picker with positions
│   │   │   ├── GapChart.tsx      # Gap history chart
│   │   │   ├── LapChart.tsx      # Lap time comparison chart
│   │   │   ├── LapSlider.tsx     # Race lap scrubber
│   │   │   ├── SessionPicker.tsx # Year/meeting/session selector
│   │   │   ├── StintTimeline.tsx # Tyre stint visualization
│   │   │   ├── UndercutGauge.tsx # Probability gauge
│   │   │   └── WeatherStrip.tsx  # Track conditions
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── App.tsx              # Root component
│   │   └── main.tsx             # Entry point
│   └── package.json
└── README.md
```

## Data Notes

- OpenF1 provides data for the **2023 season onwards**
- No API key is required
- The backend caches responses (1 hour for historical, 10 seconds for live) and rate-limits to 3 requests/second to respect API limits
- Pit-out laps and outlier laps (>120% of session mean) are filtered from pace calculations

## License

MIT
