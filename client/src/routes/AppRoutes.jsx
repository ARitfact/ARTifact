import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ModelPreview from "../pages/ModelPreview";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";
import {
  useContext,
  useState,
} from "react";
import { apiRequest } from "../services/api";
import CreateModel from "../pages/CreateModel";
import History from "../pages/History";
import Login from
  "../pages/auth/Login";
  import Dashboard from "../pages/Dashboard";
import Catalog from "../pages/Catalog";
import Signup from
  "../pages/auth/Signup";
import LandingPage from "../pages/LandingPage";
import VerifyEmail from
  "../pages/auth/VerifyEmail";

import PaymentPlansPage from
  "../pages/PaymentPlansPage";

import ProtectedRoute from
  "./ProtectedRoute";

import PublicRoute from
  "./PublicRoute";

import {
  AuthContext,
} from "../context/AuthContext";

function AppRoutesContent() {
  const navigate =
    useNavigate();
    const [pendingPhoto, setPendingPhoto] =
  useState(null);

  const {
  user,
  login,
  checkAuth,
  verificationEmail,
  setVerificationEmail,
} = useContext(AuthContext);

  const authState = {
    user,

    onAuthenticated: async (userData, signupPhoto = null) => {
  login(userData);

  const authenticatedUser =
    userData?.data?.user || userData?.user || userData;

  const email = authenticatedUser?.email?.toLowerCase();

  // Email signup: photo was held while OTP verification happened.
  // Google signup: photo arrives directly from the signup form.
  const photoToUpload =
    signupPhoto ||
    (pendingPhoto?.email === email
      ? pendingPhoto.file
      : null);

  if (photoToUpload) {
    try {
      const formData = new FormData();
      formData.append("photo", photoToUpload);

      await apiRequest("/api/v1/profile/photo", {
        method: "POST",
        body: formData,
      });

      setPendingPhoto(null);
      await checkAuth();
    } catch (error) {
      console.error("Profile photo upload failed:", error);

      navigate("/settings", {
        replace: true,
        state: {
          photoUploadError:
            "Account created, but your photo could not be saved. Please upload it again here.",
        },
      });
      return;
    }
  }

  navigate("/dashboard");
},

    onSignup: () => {
      navigate("/signup");
    },

   onForgotPassword: () => {
  navigate("/forgot-password");
},

    onRegistered: (email, _response, photo) => {
  setVerificationEmail(email);

  setPendingPhoto(
    photo
      ? {
          email: email.toLowerCase(),
          file: photo,
        }
      : null
  );

  navigate("/verify-email");
},
     

    onLogin: () => {
      navigate("/login");
    },

   onVerified: () => {
  navigate("/login");
},
  };

  return (
    <Routes>
      {/* ============================= */}
      {/* PUBLIC AUTH ROUTES            */}
      {/* ============================= */}

      <Route
        path="/login"
        element={
          
            <Login
              onAuthenticated={
                authState.onAuthenticated
              }
              onSignup={
                authState.onSignup
              }
              onForgotPassword={
                authState.onForgotPassword
              }
            />
         
        }
      />

      <Route
        path="/signup"
        element={
          
            <Signup
              onRegistered={
                authState.onRegistered
              }
              onLogin={
                authState.onLogin
              }
              onAuthenticated={authState.onAuthenticated}
            />
         
        }
      />

      <Route
        path="/verify-email"
        element={
          
<VerifyEmail
  email={verificationEmail}
  onVerified={authState.onVerified}
  onBack={authState.onLogin}
/>

        
        }
      />
      <Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>

      {/* ============================= */}
      {/* PROTECTED APPLICATION ROUTES  */}
      {/* ============================= */}

      <Route
  path="/"
  element={<LandingPage />}
/>

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/catalog"
  element={
    <ProtectedRoute>
      <Catalog />
    </ProtectedRoute>
  }
/>
<Route
  path="/preview/:source/:id"
  element={
    <ProtectedRoute>
      <ModelPreview />
    </ProtectedRoute>
  }
/>
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  }
/>
<Route
  path="/create"
  element={
    <ProtectedRoute>
      <CreateModel />
    </ProtectedRoute>
  }
/>
      <Route
        path="/plans"
        element={
          <ProtectedRoute>
            <PaymentPlansPage />
          </ProtectedRoute>
        }
      />

      {/* ============================= */}
      {/* FALLBACK ROUTE                */}
      {/* ============================= */}

<Route
  path="/history"
  element={
    <ProtectedRoute>
      <History />
    </ProtectedRoute>
  }
/>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRoutesContent />
    </BrowserRouter>
  );
}