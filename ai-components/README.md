# ProTrackAI - AI Core 🧠

This folder contains the standalone AI models and specialized components responsible for the system's "Privacy-First" activity classification.

## 🔍 Overview

The AI core is designed to categorize user activity based on metadata such as active window titles, application names, and focus duration. By running inference on the edge (locally on the machine), we eliminate the need for intrusive data collection.

### Components

-   **Classification Model**: A multi-layer neural network trained to understand work context from application metadata.
-   **Natural Language Processing**: Tokenization and cleaning logic for various executable names and window titles.
-   **Training Pipeline**: Scripts to refine model weights based on anonymized user feedback.

## 🛠️ Implementation

Built using **TensorFlow.js (Node)**, allowing for high-performance execution within the Node.js backend and the Electron-based desktop agent.

---
*Developed as part of the ProTrackAI workforce analytics suite.*
