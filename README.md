# ProTrackAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%5E18.2.0-blue)](https://react.js.org/)
[![Status](https://img.shields.io/badge/status-active-success)]()

**ProTrackAI** is an advanced, AI-driven workforce analytics platform designed to enhance productivity while respecting employee privacy. It combines a cross-platform desktop agent for activity monitoring with a robust web dashboard for real-time insights, utilizing local AI models to classify work patterns without transmitting sensitive screen data to the cloud.

---

## 🚀 Key Features

-   **🤖 Edge AI Classification**: USes `TensorFlow.js` locally to categorize user activity (Coding, Communication, Research) without sending screenshots to a server.
-   **📊 Interactive Dashboards**: Role-based access for Employees, Supervisors, and HR Managers to view productivity trends and timesheets.
-   **⏱️ Automated Time Tracking**: Precision time logging with idle detection and "break" status management.
-   **🔒 Privacy-First Architecture**: All sensitive processing happens on the client-side; only metadata and metrics are synced.
-   **📈 Goals & Performance**: Integrated OKR (Objectives and Key Results) tracking and self-evaluation modules.

## 🛠️ Technology Stack

### Backend & AI
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose ORM)
-   **AI Engine**: TensorFlow.js (Node) for server-side verification & retraining.
-   **Real-time**: Socket.io for live dashboard updates.

### Frontend (Web Dashboard)
-   **Framework**: React (Vite)
-   **Styling**: TailwindCSS
-   **Visualization**: Chart.js / Recharts for analytics data.

### Desktop Agent
-   **Core**: Electron
-   **Function**: Background activity hook, active window polling, and local inference.

---

## 📂 Project Structure

```bash
protrackai/
├── ai-components/      # Standalone AI models and training scripts
├── backend/            # REST API, Database Models, and Server Logic
│   ├── ai/             # Server-side AI verification modules
│   ├── models/         # MongoDB Schemas (User, Activity, Report)
│   └── routes/         # Express API Endpoints
├── frontend/           # React Web Application
└── agent/              # Electron Desktop Client Source
```

## 🔧 Installation & Setup

### Prerequisites
-   Node.js (v18+)
-   MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/Jesse-Shema-Kyanga/protrackAI.git
cd protrackAI
```

### 2. Install Dependencies
**Backend & Root:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/protrackai
JWT_SECRET=your_dev_secret
```

### 4. Run the Application
**Start Backend:**
```bash
npm run dev
```

**Start Frontend:**
```bash
npm run frontend
```

---

## 🛡️ Security & Privacy
This project was built with a fundamental focus on **Data Privacy**.
-   **Local processing**: Screen content is analyzed on the device.
-   **Metadata only**: Only categorized activity tags (e.g., "Work: Development") are stored, not the content of the work itself.

---

## 👤 Author
**Jesse Shema Kyanga**
-   [GitHub Profile](https://github.com/Jesse-Shema-Kyanga)

---
*Disclaimer: This project is a robust prototype developed for a Final Year Project. It demonstrates scalable architecture and applied AI in enterprise software.*
