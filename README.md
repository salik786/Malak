# MALAK MVP

A deliberately simple MVP for a health misinformation checker designed for culturally and linguistically diverse (CALD) communities.

## Overview
This system allows users to submit health claims they have heard and checks them against a fixed knowledge base of verified facts using Anthropic's API. A clinical dashboard shows aggregate real-time stats of checked claims.

## Tech Stack
- **Backend:** Python, FastAPI, Postgres
- **AI:** Anthropic API
- **Frontend (Mobile Web):** React
- **Frontend (Dashboard):** React + Recharts

## Setup Instructions

1. **Environment Variables**:
   Create a `.env` file in the `backend` directory (or set it in your environment) with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

2. **Run with Docker Compose**:
   From the root of this project, run:
   ```bash
   docker-compose up --build
   ```

3. **Access the Applications**:
   - Mobile App (End User): http://localhost:3000
   - Clinician Dashboard: http://localhost:3001
   - Backend API Docs: http://localhost:8000/docs
