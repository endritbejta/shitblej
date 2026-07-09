# Shitblej Monorepo

**Shitblej** (from Albanian: *Shit* = Sell, *Blej* = Buy) is a modern full-stack marketplace platform allowing users to list, search, buy, and sell items, as well as chat in real-time.

This repository is structured as a monorepo containing the backend API, the web client, and the mobile client.

---

## 📁 Repository Structure

```
shitblej/
├── backend/                   # Node.js + Express API
├── frontend mobile/           # React Native + Expo mobile application
└── shitblej-frontend-web/     # React + Vite web application
```

---

## 🛠️ Project Details & Tech Stack

### 1. Backend API (`backend/`)
A RESTful API built with Node.js and Express handling users, authentication, products, real-time messaging, and media uploads.
* **Core Tech:** Node.js, Express, MongoDB (Mongoose), Socket.io (real-time chat)
* **Features:**
  * JWT authentication & bcrypt security
  * Database schema for Users, Products, Messages, and Orders
  * Image upload management using Cloudinary and Multer
  * Geospatial queries & geolocation using Node-Geocoder
  * Seed script to easily populate mock data

### 2. Web Frontend (`shitblej-frontend-web/`)
A responsive web application enabling users to browse listings, upload products, manage profiles, and chat with sellers/buyers.
* **Core Tech:** React 19, Vite, React Router, TailwindCSS
* **Features:**
  * Multi-language support (English, Albanian `sq`, Serbian `sr`) powered by `i18next`
  * Real-time chat panels (buyer/seller communication)
  * Dynamic search filtering, sliders (Swiper), and responsive layout

### 3. Mobile Frontend (`frontend mobile/`)
A native cross-platform mobile application targeting iOS and Android.
* **Core Tech:** React Native, Expo, Expo Router, NativeWind (Tailwind CSS for React Native)
* **Features:**
  * File-based routing with tab navigation (`Home`, `Search`, `Saved`, `Orders`, `User`)
  * Tailored layouts for quick listing creation, product details, and saved items

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB](https://www.mongodb.com/) (either running locally or a MongoDB Atlas URI)

---

### Setup & Installation

#### 1. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` configuration file in `backend/config/config.env` (copied/adapted from your local configuration) with parameters like:
   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=...
   JWT_EXPIRE=30d
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Run in development mode (using nodemon):
   ```bash
   npm run dev
   ```

---

#### 2. Web App Setup
1. Navigate to the web frontend directory:
   ```bash
   cd shitblej-frontend-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

#### 3. Mobile App Setup
1. Navigate to the mobile app directory:
   ```bash
   cd "frontend mobile"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo builder:
   ```bash
   npx expo start
   ```
4. Open on iOS Simulator (`i`), Android Emulator (`a`), or use the Expo Go app on your phone by scanning the QR code.
