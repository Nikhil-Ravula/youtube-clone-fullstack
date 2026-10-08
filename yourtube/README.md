# 📺 YourTube Frontend Client

The frontend client for the **YourTube** platform, built with **Next.js 15**, **React 19**, **TypeScript**, and **Tailwind CSS**.

For complete project documentation, system architecture, API references, and backend instructions, see the [Root README](../README.md).

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Add your Firebase client credentials and backend URL to `.env.local`.

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Key Libraries Used
* **Next.js & React**: Core UI rendering and routing (Pages Router).
* **Tailwind CSS & Shadcn UI**: Styling, responsive layouts, and UI component primitives.
* **Lucide React**: Clean iconography.
* **Socket.IO Client**: Real-time signaling for WebRTC video meetings and in-call chat.
* **Firebase SDK**: Client-side Google OAuth 2.0 authentication.
* **Axios**: HTTP client with base URL configuration.
* **Sonner**: Toast notifications.
