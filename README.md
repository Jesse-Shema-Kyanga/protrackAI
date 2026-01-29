# ProTrackAI 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%5E18.2.0-blue)](https://react.js.org/)
[![TensorFlow.js](https://img.shields.io/badge/TF.js-Powered-orange)](https://www.tensorflow.org/js)

**ProTrackAI** is a privacy-first, AI-powered workforce analytics platform designed to bridge the gap between employee productivity tracking and individual privacy rights. 

Unlike traditional monitoring software that captures intrusive screenshots or keylogs, ProTrackAI uses **Edge AI** to analyze work patterns locally on the user's device. It classifies activities into productivity categories (e.g., "Deep Work," "Communication," "Research") *before* any data leaves the computer, ensuring that sensitive screen content never reaches the cloud.

---

## 🧠 How It Works

ProTrackAI operates on a distributed architecture to ensure speed, privacy, and scalability:

1.  **The Desktop Agent (Electron)**: 
    -   Runs quietly in the background on employee machines.
    -   Monitors active window titles and application metadata (not screen pixels).
    
2.  **Local Neural Network (TensorFlow.js)**:
    -   A lightweight classification model runs *directly on the agent*.
    -   It analyzes the metadata in real-time to determine the context (e.g., "Writing Python code in VS Code" → **Productive / Development**).
    -   **Privacy Guarantee**: Raw data is discarded immediately after classification. Only the *category tag* and *timestamp* are transmitted.

3.  **The Central Backend (Node.js & Express)**:
    -   Aggregates anonymous activity streams.
    -   Manages secure user authentication (JWT) and encrypted data storage (MongoDB).
    -   Provides real-time socket connections for live dashboard updates.

4.  **The Web Dashboard (React & Vite)**:
    -   **Employees**: View self-analytics to improve their own time management.
    -   **Managers**: See aggregated team health, burnout risks, and resource allocation without spying on individual actions.

---

## ✨ Key Features

-   **🛡️ Privacy by Design**: Zero screenshot storage. Zero keylogging. All sensitive inference happens at the edge.
-   **🤖 Intelligent Classification**: Distinguishes between generic browsing (e.g., "YouTube") and work-related research (e.g., "YouTube - React Tutorial") using context-aware NLP models.
-   **📈 Real-Time Insights**: Live productivity pulse for teams, helping identify bottlenecks instantly.
-   **🎯 Goals & OKRs**: Integrated Objective & Key Results tracking to align daily work with company vision.
-   **🧘 Wellbeing Monitoring**: automatically detects overwork patterns and suggests breaks to prevent burnout.

---

## 🛠️ Technology Stack

### Backend
-   **Runtime**: Node.js (v18+)
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose) with complex aggregation pipelines.
-   **Real-time Communication**: Socket.io

### Frontend
-   **Framework**: React 18 (Vite build tool)
-   **Styling**: TailwindCSS (Utility-first design)
-   **State Management**: React Context API
-   **Visualization**: Chart.js and Recharts for interactive data storytelling.

### AI & Agent
-   **Core Platform**: Electron (Cross-platform desktop support)
-   **Machine Learning**: TensorFlow.js (Node backend for training, Browser/Node for inference)
-   **Natural Language Processing**: Custom tokenizers for window title analysis.

---

## 🚀 Getting Started Locally

Follow these steps to get the entire ecosystem running on your machine.

### Prerequisites
1.  **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
2.  **MongoDB**: Installed and running locally on default port `27017` ([Download](https://www.mongodb.com/try/download/community))
3.  **Git**: To clone the repository.

### 1. Clone the Repository
```bash
git clone https://github.com/Jesse-Shema-Kyanga/protrackAI.git
cd protrackAI
```

### 2. Setup the Backend
The backend handles the API and database connections.

```bash
# Install dependencies
npm install

# Create environment variables
# (Copy the example file and modify if needed)
cp .env.example .env

# Start the server (Runs on port 5000)
npm run dev
```
*You should see: `Server running on http://localhost:5000` and `Connected to MongoDB`*

### 3. Setup the Frontend
The frontend provides the visual dashboard.

```bash
# Open a new terminal tab
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*Open your browser to `http://localhost:5173` (or the port shown).*

### 4. Run the Desktop Agent (Simulation)
In a production environment, this runs as a standalone app. For development, we simulate it via the backend or run it in Electron dev mode.

```bash
# Open a third terminal tab
cd backend/agent

# Install dependencies
npm install

# Start the agent
npm start
```

---

## 👤 Author

**Jesse Shema Kyanga**
-   Full Stack Developer & AI Enthusiast
-   [GitHub Profile](https://github.com/Jesse-Shema-Kyanga)

---

## 📄 License

This project is licensed under the access-restricted specific license - see the LICENSE file for details.
*Note: This is a academic final year project prototype.*
