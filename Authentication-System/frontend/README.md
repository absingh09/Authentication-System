# Premium SaaS Authentication System - React + Vite Frontend

This is a production-ready, highly polished SaaS authentication system built with React, Vite, and Tailwind CSS. It connects seamlessly to the existing FastAPI + MongoDB backend and is structured with a modular, plug-and-play architecture for easy reusability.

---

## 🌟 Key Features

- **Auth Pages**: Login, Register, Forgot Password, Reset Password.
- **Protected Pages**: Dashboard (Welcome card, account stats, active session details, activity tracking) and Settings (Profile info updates, password updates, theme selector).
- **Reusable Auth Module**: Encapsulated under `src/modules/auth/` (includes forms, route guards, custom hooks, services, state stores, and utility scripts) with zero app-specific dependencies.
- **Centralized API Client**: Axios client with interceptors to inject JWT headers and handle automatic token refresh via `/refresh` on 401 expiration errors.
- **State Management**: Zustand store persisted to `localStorage` with session handling (conditional "Remember Me" persistence).
- **UI & UX Kit**: Beautiful custom glassmorphism styles, dark/light theme toggler, skeletal loading frames, and notifications (React Hot Toast).
- **Security Checkers**: Live password strength checking (8+ chars, uppercase, digit checklist) with a color-coded meter.

---

## 🛠️ Tech Stack

- **React 19**
- **Vite 8** (Asset bundler & dev server)
- **Tailwind CSS v4** (Utility styling, theme adjustments in CSS)
- **Framer Motion 12** (Micro-animations, modal transitions)
- **Zustand 5** (Global state management)
- **React Router DOM 7** (Declarative route tree & route guarding)
- **React Hook Form 7** (Validated forms)
- **Axios 1** (API calls & token refresh interceptors)
- **Lucide React** (Icons)
- **React Hot Toast** (Toast notifications)

---

## 🚀 Setup & Installation

### 1. Backend Configuration
Ensure your FastAPI backend `.env` file (at the project root) is configured properly, especially the `FRONTEND_URL` parameter to make password reset emails point to your local React Vite server:

```env
FRONTEND_URL=http://localhost:5173
```

### 2. Frontend Configuration
Navigate to the `frontend/` directory and configure the environment variables:
Create a `.env` file in the `frontend/` directory (already configured with local defaults):

```env
VITE_API_URL=http://localhost:8000/api/users
```

### 3. Install Dependencies & Run
Execute the following commands inside the `frontend/` directory:

```bash
# Install dependencies
npm install

# Run the local development server (proxies API requests to localhost:8000)
npm run dev

# Build the production bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## 🧩 Reusable Auth Module Guide

The authentication module at `src/modules/auth/` is designed to be completely self-contained. You can easily reuse it in any future React project.

### How to Import the Module:
1. **Copy the Folder**:
   Copy the `src/modules/auth/` folder and paste it into your new React project's `src/modules/` directory.

2. **Configure your API Client**:
   Ensure you have a centralized Axios instance (similar to `src/api/authApi.js`) at `src/api/authApi.js` in your host application, or adjust the relative import path inside `src/modules/auth/store/authStore.js` and `src/modules/auth/api/` to point to your axios client.

3. **Install Peer Dependencies**:
   Install the required libraries in the host project:
   ```bash
   npm install zustand axios react-router-dom react-hook-form react-hot-toast lucide-react framer-motion
   ```

4. **Mount Route Guards and Pages**:
   You can easily import all components directly from the module's index:
   ```javascript
   import { 
     ProtectedRoute, 
     GuestRoute, 
     Login, 
     Register, 
     ForgotPassword, 
     ResetPassword 
   } from './modules/auth';
   ```

   Use them in your React Router configuration:
   ```jsx
   <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
   ```
