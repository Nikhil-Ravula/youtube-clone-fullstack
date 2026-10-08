# 🎥 YourTube — Full-Stack Video Sharing & Real-Time Video Conferencing Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Peer--to--Peer-orange?style=for-the-badge&logo=webrtc)](https://webrtc.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-yellow?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

**YourTube** is an all-in-one modern multimedia web platform that brings together the rich functionality of **YouTube** (video sharing, streaming, channels, subscriptions, comments, and playlists) and the real-time collaboration of **Google Meet** (multi-peer WebRTC video conferencing, screen sharing, live chat, and reactions) into a single, cohesive full-stack application.

---

## ✨ Features Overview

### 📺 1. YouTube Video Sharing & Streaming
* **Video Uploading & Processing**: Upload videos with real-time upload progress tracking and automatic file handling via Multer.
* **Modern Video Player**: Custom video playback experience with controls for play/pause, seek scrubber, volume control, and full-screen view.
* **Channel Management**: 
  * Create custom channels with unique names and descriptions.
  * Dedicated channel profile pages showing uploaded videos, subscriber counts, and channel details.
* **Social Engagement**:
  * **Like / Dislike**: Real-time counter updates on videos.
  * **Interactive Comments**: Add, view, and read timestamps and user avatar details on video discussions.
  * **Subscriptions**: Subscribe/Unsubscribe to your favorite creators with live subscriber counters.
* **Personalized Feeds & Library**:
  * **Subscriptions Feed**: Dedicated page showcasing videos from channels you follow.
  * **Watch Later**: Save videos to your personalized playlist.
  * **History**: Automatically track and review previously watched videos.
  * **Liked Videos**: Quick access to all videos you've liked.
* **Search & Exploration**:
  * Search bar with instant video search results.
  * Category tags and filter tabs for quick topic discovery.
* **Responsive Mobile & Desktop Design**:
  * Collapsible desktop sidebar drawer and compact mode.
  * Native-app style bottom navigation bar (`MobileBottomNav`) for mobile and tablet devices.

---

### 📹 2. Real-Time WebRTC Video Meetings (Google Meet Experience)
* **Instant & Scheduled Rooms**: Create a video meeting room in one click or join any existing room using a code or link.
* **Pre-Join Screen**: Test and toggle your camera and microphone preview before entering the call.
* **Multi-Peer WebRTC Mesh**:
  * Seamless low-latency audio/video streaming across multiple participants.
  * Robust NAT traversal with Google STUN and OpenRelay TURN servers (supporting UDP, TCP, and TLS ports).
* **Meeting Room Controls**:
  * 🎙️ **Microphone Toggle**: Mute and unmute your audio.
  * 📹 **Camera Toggle**: Turn camera video feed on and off.
  * 🖥️ **Screen Sharing**: High-definition screen sharing with system audio capture.
  * 🔴 **Meeting Recording**: Record entire meeting sessions directly in your browser.
* **Live In-Meeting Chat**:
  * Real-time text messaging between participants powered by Socket.IO.
  * File attachment sharing directly within the chat sidebar.
* **Floating Emoji Reactions**:
  * Send animated floating emoji reactions (👏, ❤️, 👍, 🎉, 😂, 🔥) visible to all participants.
* **Host & Security Controls**:
  * End meeting for all participants or leave individually.
  * Lock meeting rooms to prevent new joiners.
  * Granular host permissions to enable/disable participant chat and screen sharing.

---

### 🔐 3. Authentication & Security
* **Firebase Google Authentication**: One-click Google Single Sign-On (SSO) with secure session handling.
* **Environment-Isolated Secrets**: All sensitive keys, database URIs, and endpoints are securely loaded via `.env` files and protected via `.gitignore`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) (Pages Router), React, TypeScript |
| **Styling & UI Components** | [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), Lucide Icons, Sonner Toasts |
| **Backend & Server** | [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/) |
| **Real-Time Communication** | [Socket.IO](https://socket.io/), [WebRTC](https://webrtc.org/) (RTCPeerConnection) |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/), [Mongoose](https://mongoosejs.com/) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/) (Google OAuth) |
| **Media & File Storage** | Multer for local multipart streaming & file storage |

---

## 📂 Project Architecture

```text
youtube_c/
├── yourtube/                     # Next.js Client & Frontend
│   ├── public/                   # Static assets & icons
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── meet/             # Video conferencing components (VideoTile, Chat, Controls)
│   │   │   ├── ui/               # Reusable UI primitives (dialog, button, avatar, etc.)
│   │   │   ├── Header.tsx        # Navigation header with search and action buttons
│   │   │   ├── Sidebar.tsx       # Desktop responsive navigation drawer
│   │   │   ├── Videopplayer.tsx  # Interactive video player
│   │   │   ├── VideoUploader.tsx # Video upload modal with progress
│   │   │   └── ...
│   │   ├── lib/                  # Shared libraries, contexts, and WebRTC hook
│   │   │   ├── webrtc/           # useMeetingRoom.ts (WebRTC state machine & signaling)
│   │   │   ├── AuthContext.js    # Firebase auth state & session provider
│   │   │   └── firebase.js       # Firebase SDK initialization
│   │   └── pages/                # Next.js routes
│   │       ├── index.tsx         # Video home feed
│   │       ├── watch/[id]/       # Watch video page
│   │       ├── meet/             # Video meeting lobby & room pages
│   │       ├── channel/[id]/     # Channel details & upload page
│   │       ├── subscriptions/    # Subscriptions feed
│   │       └── ...
│   ├── .env.example              # Frontend environment variables template
│   └── package.json
│
├── server/                       # Node.js Express Backend
│   ├── controllers/              # REST controllers (auth, video, comments, likes, meet)
│   ├── Modals/                   # Mongoose data models
│   ├── routes/                   # Express API routes
│   ├── filehelper/               # Multer configurations for videos and meeting files
│   ├── socket.js                 # WebRTC signaling server & real-time socket events
│   ├── index.js                  # Express server entry point
│   ├── .env.example              # Backend environment variables template
│   └── package.json
│
├── .gitignore                    # Global git ignore (secures secrets & node_modules)
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have installed:
* [Node.js](https://nodejs.org/) (v18.x or newer)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* A [MongoDB Atlas](https://www.mongodb.com/) account or a local MongoDB database
* A [Firebase Project](https://console.firebase.google.com/) for Google Sign-In

---

### 1. Clone the Repository
```bash
git clone https://github.com/Nikhil-Ravula/youtube-clone-fullstack.git
cd youtube-clone-fullstack
```

---

### 2. Backend Setup
1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   npm install
   ```

2. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

3. Configure your `server/.env` variables:
   ```env
   PORT=5000
   DB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/yourtube?retryWrites=true&w=majority
   ```

4. Start the backend server:
   ```bash
   npm start
   ```
   *The backend will be running at `http://localhost:5000`.*

---

### 3. Frontend Setup
1. In a new terminal, navigate to the `yourtube` directory:
   ```bash
   cd yourtube
   npm install
   ```

2. Create your `.env.local` configuration file:
   ```bash
   cp .env.example .env.local
   ```

3. Configure your `yourtube/.env.local` with your Firebase and backend URLs:
   ```env
   BACKEND_URL=http://localhost:5000
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

   # Firebase Client Credentials
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description |
|---|---|
| `PORT` | Port for Express & Socket.IO server (default: `5000`) |
| `DB_URL` | MongoDB connection URI string |

### Frontend (`yourtube/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Express server URL (e.g. `http://localhost:5000`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics Measurement ID |

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
