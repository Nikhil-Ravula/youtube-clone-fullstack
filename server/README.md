# ⚙️ YourTube Backend Server

The backend REST API and WebRTC signaling server for the **YourTube** platform, built with **Node.js**, **Express 5**, **Socket.IO**, and **MongoDB Atlas (Mongoose)**.

For full project documentation and frontend setup, see the [Root README](../README.md).

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Add your MongoDB Atlas connection string (`DB_URL`) to `.env`.

3. **Start development server**:
   ```bash
   npm start
   ```
   The backend server will run on `http://localhost:5000` with WebSockets and Socket.IO enabled.

---

## 📡 Core Responsibilities
* **Video Management**: Multipart video upload processing via Multer into `/uploads` with streaming endpoints.
* **Social Systems**: User channels, comments, likes/dislikes, watch history, watch later playlists, and subscriptions.
* **WebRTC Signaling**: Real-time Socket.IO room management, SDP offers/answers exchange, ICE candidate routing, and in-meeting chat/reaction broadcast.
* **Database**: MongoDB Mongoose schemas for Users, Videos, Comments, Likes, Subscriptions, and Meetings.
