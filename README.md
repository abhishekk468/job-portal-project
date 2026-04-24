# 🚀 NexaJobs - Modern Job Portal Solution

NexaJobs is a comprehensive, full-stack job portal designed to bridge the gap between talented job seekers and forward-thinking employers. Built with a focus on speed, aesthetics, and ease of use, it features a glassmorphism UI and a robust Node.js backend.

## 🌐 Live Demo
- **Frontend (Vercel):** [Your Vercel URL Here]
- **Backend API (Render):** [https://nexajobs-backend.onrender.com](https://nexajobs-backend.onrender.com)

## ✨ Key Features

### For Job Seekers
- **Dynamic Job Discovery:** Real-time search and advanced filtering by location, type, and category.
- **Glassmorphism UI:** Stunning, modern interface with interactive animations.
- **Easy Application:** One-click application process with cover letter support.
- **Responsive Design:** Optimized for mobile, tablet, and desktop viewing.

### For Employers & Admins
- **Unified Admin Dashboard:** Manage all jobs and applications from a single, intuitive interface.
- **Real-time Stats:** Track total jobs, active listings, and application counts.
- **Job Management:** Create, update, featured, or deactivate job listings instantly.
- **Application Tracking:** Review candidate details and manage application statuses.

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Glassmorphism Design), JavaScript (ES6+).
- **Backend:** Node.js, Express.js (v4).
- **Database:** MongoDB Atlas (Cloud Database).
- **Authentication:** JSON Web Tokens (JWT) with secure bcrypt encryption.
- **Deployment:** Vercel (Frontend), Render (Backend).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abhishekk468/job-portal-project.git
   cd NexaJobs
   ```

2. **Configure Backend:**
   - Go to `backend` folder.
   - Create a `.env` file:
     ```env
     PORT=5000
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_secret_key
     ```
   - Install dependencies and start:
     ```bash
     npm install
     npm start
     ```

3. **Configure Frontend:**
   - Update `frontend/config.js` with your local API URL:
     ```javascript
     const API_BASE_URL = 'http://localhost:5000/api';
     ```
   - Open `frontend/index.html` in your browser.

## 📄 License
This project is licensed under the MIT License.

---
Built with ❤️ by [Abhishek](https://github.com/abhishekk468)
