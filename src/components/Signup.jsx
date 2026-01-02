// src/components/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, createUserWithEmailAndPassword, updateProfile, db, setDoc, doc, serverTimestamp } from "../firebase";
import "./Signup.css"; // Import the CSS file

export default function Signup({ onSignup }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    sawmillName: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // 1. Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // 2. Update user profile with display name
      await updateProfile(user, {
        displayName: formData.name
      });

      // 3. Save additional user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        sawmillName: formData.sawmillName,
        createdAt: serverTimestamp(),
        role: "owner"
      });

      // 4. Show success message and redirect to login
      setSuccess(true);
      
      // 5. Auto-redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-card-body">
          {/* Header */}
          <div className="signup-header">
            
            <h1 className="signup-title">Shiva Sakthi Sawmill</h1>
            <p className="signup-subtitle">Join Sawmill Pro to manage your business</p>
          </div>
          
          {/* Alert Messages */}
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span className="alert-message">{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <span className="alert-message">
                Account created successfully! Redirecting to login...
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-grid">
              {/* Sawmill Name */}
              <div className="form-group">
                <label className="form-label">
                  Sawmill Name
                </label>
                <input
                  type="text"
                  name="sawmillName"
                  value={formData.sawmillName}
                  onChange={handleChange}
                  placeholder="Enter your sawmill business name"
                  required
                  className="form-input"
                />
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="form-input"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="form-input"
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="form-input"
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min. 6 characters)"
                  required
                  className="form-input"
                />
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || success}
              className="btn btn-primary btn-signup"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="signup-footer">
            <span className="footer-text">
              Already have an account?{" "}
            </span>
            <Link to="/login" className="footer-link">
              Sign In
            </Link>
          </div>

          {/* Security Note */}
          <div className="security-note">
            <div className="security-icon">🔒</div>
            <div className="security-text">
              Your data is securely encrypted and protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}