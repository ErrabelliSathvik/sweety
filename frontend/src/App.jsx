import { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";

const API_URL = "http://127.0.0.1:5000/api/auth";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(
    () => localStorage.getItem("sweety_token") || ""
  );

  // LOGIN AND REGISTRATION
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!isLogin && name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/login" : "/register";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(isLogin ? {} : { name: name.trim() }),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (isLogin) {
        if (!data.token) {
          throw new Error("Login response did not contain an authentication token.");
        }

        localStorage.setItem("sweety_token", data.token);
        setToken(data.token);
        setPassword("");
      } else {
        setMessage("Registration successful. Please log in.");
        setIsLogin(true);
        setName("");
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("sweety_token");
    setToken("");
    setEmail("");
    setPassword("");
    setMessage("");
    setError("");
  };

  // AUTHENTICATED DASHBOARD
if (token) {
  return (
    <Dashboard onLogout={handleLogout} />
  );
}

  // LOGIN AND REGISTRATION SCREEN
  return (
    <main className="app-container">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-icon">♥</span>
          <h1>Sweety</h1>
        </div>

        <p className="subtitle">
          Your personal blood glucose tracker
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={isLogin ? "tab active" : "tab"}
            onClick={() => {
              setIsLogin(true);
              setError("");
              setMessage("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={!isLogin ? "tab active" : "tab"}
            onClick={() => {
              setIsLogin(false);
              setError("");
              setMessage("");
            }}
          >
            Register
          </button>
        </div>

        <h2>
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        <p className="form-description">
          {isLogin
            ? "Sign in to manage your glucose readings."
            : "Create an account to start tracking your glucose."}
        </p>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              maxLength={72}
              required
            />

            {!isLogin && (
              <small>Password must be at least 8 characters.</small>
            )}
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="switch-text">
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default App;
