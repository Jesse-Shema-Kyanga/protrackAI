# ProTrackAI - Backend ⚙️

This directory contains the core API service and database logic for the ProTrackAI system.

## 🏗️ Architecture

The backend is built as a RESTful service using Node.js and Express. It interfaces with MongoDB to manage persistent data and integrates with local AI components for activity verification.

### Key Components

-   **Models (`/models`)**: Mongoose schemas defining the data structure for Users, Organizations, Activities, Reports, and System Goals.
-   **Routes (`/routes`)**: API endpoints categorized by functional area (Auth, Analytics, Feedback, AI control).
-   **AI Layer (`/ai`)**: Server-side logic for training and deploying the classification model (TensorFlow.js).
-   **Middleware (`/middleware`)**: Secure authentication gating and request validation logic.

## 🛠️ Tech Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB
-   **Communication**: Socket.io for real-time events.

## 🚀 Development Setup

1.  Ensure a `.env` file is present (see `.env.example` in the root).
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Seed the database with test data:
    ```bash
    node seed_demo.js
    ```
4.  Launch the server:
    ```bash
    npm run dev
    ```

---
*Developed as part of the ProTrackAI workforce analytics suite.*
