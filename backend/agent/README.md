# ProTrackAI - Desktop Agent (Electron) 🛰️

The desktop agent is the client-side component of ProTrackAI that runs on employee machines to gather activity metadata.

## 🔍 How it Works

The agent is built on Electron and performs the following tasks:
-   **Active Window Polling**: Periodically checks the focused window title and process name.
-   **Edge Inference**: Uses the local TensorFlow.js model to classify the active window into productivity categories.
-   **Data Sync**: Securely transmits the *classified results* (not raw titles or screenshots) to the backend API.
-   **Idle Detection**: Automatically pauses tracking when no user input is detected for a configurable duration.

## 🛠️ Tech Stack

-   **Runtime**: Node.js
-   **shell**: Electron
-   **OS Hooks**: Native process polling modules.
-   **AI**: TensorFlow.js (local inference).

## 🚀 Development Setup

1.  Navigate to the agent directory:
    ```bash
    cd backend/agent
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the agent in development mode:
    ```bash
    npm start
    ```

---
*Developed as part of the ProTrackAI workforce analytics suite.*
