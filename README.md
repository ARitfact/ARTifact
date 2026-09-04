# ARTifact

### AI-Powered 3D & Augmented Reality Platform

ARTifact is a full-stack AI-powered platform that transforms 2D images of real-world objects into interactive 3D models and enables users to visualize those models in Augmented Reality.

The platform is designed to simplify 3D creation and visualization without requiring professional 3D modeling skills.

---

## 🌐 Live Demo

🚀 **Live Application:**  
https://ar-tifact-eight.vercel.app/

---

## 🎯 Project Overview

Traditional 3D modeling requires specialized software, technical knowledge, and considerable time.

ARTifact aims to solve this problem by providing a simple workflow:

```text
        Upload Image
             ↓
      AI Image Processing
             ↓
       3D Model Generation
             ↓
      Interactive 3D Viewer
             ↓
       Augmented Reality



Users can upload an image of an object, generate a 3D model using AI, view the model interactively, and access previously generated models through their personal history.

✨ Features
🤖 AI-Powered 3D Generation
Convert 2D images into 3D models
AI-powered image-to-3D generation
Automated model processing
PBR and texture support
GLB model output
🧊 Interactive 3D Viewer
Interactive 3D model visualization
Rotate the model
Zoom in/out
Inspect generated models
Web-based 3D viewing
📱 Augmented Reality
View generated models in AR
Place supported 3D objects in the real environment
Real-world visualization using the device camera
👤 User Accounts

Planned authentication system includes:

User registration
Login
Secure password hashing
JWT authentication
Google OAuth login
Email verification
Password reset
User profiles
🗂️ Model History

Each user will have a personal model library.

Users will be able to:

View previously generated models
Access model history
Download models
View model creation dates
Manage their generated models
☁️ Cloud Storage

Generated models and assets will be stored using cloud object storage.

This allows users to access their models without depending on the local machine.

📥 Model Download

Users can download generated 3D models in supported formats.

🏗️ System Architecture
                         ARTifact
                            │
                            ↓
                    ┌───────────────┐
                    │ React + Vite  │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                            │ HTTPS / REST API
                            ↓
                    ┌───────────────┐
                    │ Node.js       │
                    │ Express.js    │
                    │ Backend       │
                    └───────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ↓                 ↓                 ↓
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ PostgreSQL   │  │ Cloud Storage│  │  Tripo3D     │
   │ Database     │  │              │  │  AI API      │
   │              │  │ Images       │  │              │
   │ Users        │  │ GLB Models   │  │ Image → 3D   │
   │ Profiles     │  │ Thumbnails   │  │ Generation   │
   │ Models       │  │              │  │              │
   │ History      │  │              │  │              │
   └──────────────┘  └──────────────┘  └──────────────┘
          │
          ↓
   ┌────────────────────┐
   │ Authentication     │
   │                    │
   │ JWT                │
   │ Google OAuth       │
   │ bcrypt             │
   │ Email Verification │
   └────────────────────┘
🛠️ Technology Stack
Frontend
React.js
Vite
JavaScript
HTML5
CSS3
Model Viewer
Responsive Web Design
Backend
Node.js
Express.js
REST API
Axios
Multer
FormData
dotenv
CORS
Database
PostgreSQL
Neon PostgreSQL
Authentication
JWT
bcrypt
Google OAuth 2.0
Email verification
Cloud Storage
Cloudflare R2
AI / 3D
Tripo3D API
GLB
glTF
PBR Materials
Web-based 3D visualization
Deployment
Vercel
Render
Neon
Cloudflare R2
Version Control
Git
GitHub
GitHub Organization
🔄 Application Workflow
┌────────────────────┐
│     User Uploads   │
│       Image        │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│    React Frontend  │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│   Express Backend  │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│     Tripo3D API    │
│                    │
│    Image → 3D      │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│    GLB 3D Model    │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│   Cloud Storage    │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│   PostgreSQL DB    │
│                    │
│ User + Model Data  │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│   3D Web Viewer    │
└─────────┬──────────┘
          │
          ↓
┌────────────────────┐
│ Augmented Reality  │
└────────────────────┘
👤 User System

ARTifact is being designed around individual user accounts.

Each user will have their own profile and model library.

User
 │
 ├── Profile
 │
 ├── Generated Models
 │      │
 │      ├── Model 1
 │      ├── Model 2
 │      └── Model 3
 │
 └── Generation History
🔐 Authentication Architecture

ARTifact will support multiple authentication methods.

Email & Password
Register
   ↓
Validate Email
   ↓
Hash Password
   ↓
Store User
   ↓
Send Verification Email
   ↓
Verify Email
   ↓
Login
   ↓
JWT
   ↓
Authenticated User
Google Authentication
Continue with Google
        ↓
Google OAuth 2.0
        ↓
ARTifact Backend
        ↓
Find / Create User
        ↓
JWT Authentication
        ↓
User Dashboard
🗃️ Database Design

The database will maintain relationships between users and their generated models.

Users
users
 ├── id
 ├── name
 ├── email
 ├── password_hash
 ├── google_id
 ├── profile_image
 ├── email_verified
 ├── created_at
 └── updated_at
Models
models
 ├── id
 ├── user_id
 ├── name
 ├── task_id
 ├── model_url
 ├── thumbnail_url
 ├── created_at
 └── updated_at
Relationship
User
  │
  │ 1
  │
  │
  │ *
  ↓
Models

One user can have multiple generated models.

☁️ Cloud Storage Architecture

3D models can be significantly larger than normal database records.

Therefore, actual model files should not be stored directly inside the database.

Instead:

PostgreSQL
     │
     └── Stores metadata
            │
            ├── Model ID
            ├── User ID
            ├── Model Name
            └── Model URL

Cloud Storage
     │
     └── Stores actual files
            │
            ├── .glb
            ├── Images
            └── Thumbnails
📱 Augmented Reality

ARTifact aims to allow users to visualize generated 3D objects in their real environment.

Generated 3D Model
        ↓
     AR Viewer
        ↓
Device Camera
        ↓
Real Environment
        ↓
Virtual Object

This can be particularly useful for:

Furniture visualization
Interior design
Product visualization
Object placement
Concept visualization
🏠 Interior Design Use Case

One of ARTifact's major potential applications is interior design.

For example:

Take Picture
     ↓
Furniture Image
     ↓
AI 3D Generation
     ↓
3D Furniture Model
     ↓
AR Placement
     ↓
Visualize Inside Room

Users could eventually preview furniture and other objects in their own environment before purchasing or designing them.

📂 Project Structure
ARTifact/
│
├── frontend/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   │
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── README.md
└── package.json
⚙️ Installation
Prerequisites

Make sure the following are installed:

Node.js
npm
Git
Clone Repository
git clone https://github.com/YOUR-ORGANIZATION/ARTifact.git

Move into the project:

cd ARTifact
💻 Frontend Setup

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start development server:

npm run dev
🖥️ Backend Setup

Open another terminal.

Navigate to backend:

cd backend

Install dependencies:

npm install

Start backend:

npm start
🔑 Environment Variables

Create a .env file inside the backend directory.

Example:

PORT=5000

TRIPO_API_KEY=your_tripo_api_key

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id

GOOGLE_CLIENT_SECRET=your_google_client_secret

RESEND_API_KEY=your_resend_api_key

R2_ACCESS_KEY_ID=your_r2_access_key

R2_SECRET_ACCESS_KEY=your_r2_secret_key

R2_BUCKET_NAME=your_bucket_name

R2_ENDPOINT=your_r2_endpoint
⚠️ Security

Never commit secrets to GitHub.

The following files should never be pushed:

.env
.env.local

Add them to .gitignore:

.env
.env.local
node_modules/
dist/

API keys, database credentials, OAuth secrets, and other private credentials must remain server-side.

🌐 Deployment Architecture

ARTifact is designed around a distributed cloud architecture.

                    INTERNET
                        │
                        ↓
               ┌─────────────────┐
               │     Vercel      │
               │    Frontend     │
               └────────┬────────┘
                        │
                        ↓
               ┌─────────────────┐
               │     Render      │
               │ Node + Express  │
               └────────┬────────┘
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
     ┌─────────┐   ┌─────────┐   ┌─────────┐
     │  Neon   │   │Cloudflare│   │ Tripo3D │
     │Postgres │   │    R2    │   │   API   │
     └─────────┘   └─────────┘   └─────────┘
💰 Cost-Efficient Infrastructure

ARTifact is designed to use free or low-cost cloud infrastructure during development.

Potential infrastructure:

Service	Purpose
Vercel	Frontend hosting
Render	Backend hosting
Neon	PostgreSQL database
Cloudflare R2	File storage
Resend	Email
Google OAuth	Authentication
Tripo3D	AI 3D generation
GitHub	Source control

AI generation services may require credits depending on usage.

🧪 Development Status

ARTifact is currently under active development.

Current
 React frontend
 Image upload
 Tripo3D integration
 Image-to-3D generation
 3D model viewer
 GLB model support
 Model download
 Initial AR functionality
 Vercel deployment
 GitHub organization
In Development
 PostgreSQL integration
 User registration
 Login system
 JWT authentication
 Email verification
 Google OAuth
 User profiles
 User dashboard
 Model history
 Cloud model storage
🗺️ Roadmap
Phase 1 — Core Platform
 Image upload
 AI 3D generation
 3D viewer
 GLB download
 Initial AR support
Phase 2 — User System
 Registration
 Login
 JWT authentication
 Email verification
 Google OAuth
 Password reset
 User profiles
Phase 3 — Cloud Platform
 PostgreSQL database
 Cloud model storage
 User-specific model history
 Model management
 Model deletion
 Model sharing
Phase 4 — AR & Visualization
 Improved AR placement
 Object scaling
 Object rotation
 Object dimensions
 Furniture visualization
 Room visualization
Phase 5 — AI Features
 AI object modification
 AI-assisted interior design
 Automatic object classification
 Smart model optimization
 Multiple image reconstruction
Phase 6 — Platform
 Public model gallery
 Model sharing
 Collaboration
 Mobile application
 Analytics
 Advanced user dashboard
🔮 Future Vision

ARTifact aims to become more than an image-to-3D converter.

The long-term vision is:

              REAL WORLD
                   │
                   ↓
              2D IMAGE
                   │
                   ↓
             AI PROCESSING
                   │
                   ↓
              3D MODEL
                   │
          ┌────────┴────────┐
          ↓                 ↓
     3D Visualization      AR
          │                 │
          ↓                 ↓
     Digital World     Real World

The platform can eventually be expanded into applications for:

🏠 Interior Design
🛋️ Furniture Visualization
🛍️ E-commerce
🏭 Product Visualization
🏗️ Architecture
🎨 Digital Design
📦 Product Prototyping
🥽 AR Experiences
🎓 Academic & Portfolio Value

ARTifact combines multiple areas of modern software development:

Frontend Development
        +
Backend Development
        +
REST APIs
        +
AI Integration
        +
3D Graphics
        +
Augmented Reality
        +
Authentication
        +
Databases
        +
Cloud Storage
        +
Cloud Deployment

This makes ARTifact a full-stack project demonstrating practical experience across multiple technologies.

📈 Scalability

The architecture is designed so individual components can be upgraded independently.

Small Scale
    ↓
Free Cloud Services
    ↓
Growing Users
    ↓
Scalable Database
    ↓
Dedicated Storage
    ↓
Dedicated Backend
    ↓
Production Infrastructure

This allows ARTifact to evolve from a college project into a production-ready platform.

🤝 Contributing

Contributions are welcome.

Steps
Fork the repository
Create a feature branch
git checkout -b feature/your-feature
Make your changes
Commit your changes
git add .
git commit -m "Add: your feature"
Push the branch
git push origin feature/your-feature
Create a Pull Request
👥 Team
ARTifact Development Team

ARTifact is developed collaboratively as a full-stack AI and AR project.

Contributors
Add Team Member 1
Add Team Member 2
Add Team Member 3
Add Team Member 4
📸 Screenshots

Add project screenshots here.

Example:

![ARTifact Home](screenshots/home.png)

![3D Viewer](screenshots/3d-viewer.png)

![AR Viewer](screenshots/ar-viewer.png)
🌟 Why ARTifact?

ARTifact focuses on making 3D creation and visualization easier.

Instead of requiring users to:

Learn 3D Software
       ↓
Create 3D Model
       ↓
Apply Textures
       ↓
Export Model
       ↓
Configure AR

ARTifact aims to provide:

Upload Image
      ↓
AI
      ↓
3D Model
      ↓
AR
📜 License

This project is currently developed for educational, research, and portfolio purposes.

⭐ Support

If you find ARTifact interesting, consider giving the repository a ⭐ on GitHub.

ARTifact
From Images to 3D. From 3D to Reality.

AI × 3D × AR
