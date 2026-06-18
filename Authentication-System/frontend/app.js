// The address of our FastAPI backend
const API_URL = "http://127.0.0.1:8000/api/users";


// ─── HELPER: Show a message box ───────────────────────────────────────────────
function showMessage(text, type) {
  var messageBox = document.getElementById("message");
  messageBox.textContent = text;         // Set the text
  messageBox.className = "message " + type;  // Add "success" or "error" class
  messageBox.style.display = "block";    // Make it visible
}

// ─── PASSWORD STRENGTH CHECK ──────────────────────────────────────────────────
function isPasswordStrong(password) {
  // At least 8 characters
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters." };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must include at least 1 uppercase letter." };
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must include at least 1 number." };
  }

  return { valid: true, reason: "" };
}


// ─── LIVE FEEDBACK WHILE TYPING ────────────────────────────────────────────────
function checkPasswordStrength() {
  var password = document.getElementById("password").value;
  var hint = document.getElementById("passwordHint");

  var result = isPasswordStrong(password);

  if (password.length === 0) {
    // Reset to default gray hint when empty
    hint.style.color = "#888";
    hint.textContent = "Must be 8+ characters, with 1 uppercase letter & 1 number";
  } else if (result.valid) {
    hint.style.color = "#16a34a";   // green
    hint.textContent = "✓ Strong password!";
  } else {
    hint.style.color = "#dc2626";   // red
    hint.textContent = result.reason;
  }
}

// ─── REGISTER FUNCTION ────────────────────────────────────────────────────────
async function register() {
  // 1. Read values from the input fields
  var username = document.getElementById("username").value.trim();
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value.trim();

  // 2. Basic check — don't send empty fields
  if (!username || !email || !password) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  // 2.5 Check password strength before sending to backend
  var strength = isPasswordStrong(password);
  if (!strength.valid) {
    showMessage(strength.reason, "error");
    return;
  }
  // 3. Disable button so user can't click twice
  var btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  // 4. Send the data to our FastAPI backend
  try {
    var response = await fetch(API_URL + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, email: email, password: password })
    });

    var data = await response.json();

  if (response.ok) {
      // Success! Show message then redirect to login after 1.5 seconds
      showMessage("Account created! Redirecting to login...", "success");
      setTimeout(function() {
        window.location.href = "index.html";
      }, 1500);
    } else if (response.status === 429) {
      showMessage("Too many attempts. Please wait a minute and try again.", "error");
    } else {
      // Backend returned an error (e.g. email already exists)
      showMessage(data.detail, "error");
    }

  } catch (error) {
    // Network error (e.g. server not running)
    showMessage("Cannot connect to server. Is it running?", "error");
  }

  // 5. Re-enable the button
  btn.disabled = false;
  btn.textContent = "Create Account";
}


// ─── LOGIN FUNCTION ───────────────────────────────────────────────────────────
async function login() {
  // 1. Read values from inputs
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value.trim();

  // 2. Basic check
  if (!email || !password) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  // 3. Disable button
  var btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  // 4. Send login request to backend
  try {
    var response = await fetch(API_URL + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    });

    var data = await response.json();

    if (response.ok) {
          // Save BOTH tokens in localStorage
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);

          // Redirect to dashboard
          window.location.href = "dashboard.html";
    } else if (response.status === 429) {
      showMessage("Too many login attempts. Please wait a minute and try again.", "error");
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server. Is it running?", "error");
  }

  // 5. Re-enable button
  btn.disabled = false;
  btn.textContent = "Login";
}


// ─── REFRESH THE ACCESS TOKEN ─────────────────────────────────────────────────
async function refreshAccessToken() {
  var refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return false;   // No refresh token available, user must login again
  }

  try {
    var response = await fetch(API_URL + "/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    var data = await response.json();

    if (response.ok) {
      // Save the new tokens
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return true;    // Refreshed successfully!
    } else {
      return false;   // Refresh token also expired — must login again
    }

  } catch (error) {
    return false;
  }
}


// ─── LOAD DASHBOARD ───────────────────────────────────────────────────────────
async function loadDashboard() {
  var token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    var response = await fetch(API_URL + "/me", {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });

    // If access token expired, try refreshing it automatically
    if (response.status === 401) {
      var refreshed = await refreshAccessToken();

      if (refreshed) {
        // Try again with the NEW token
        token = localStorage.getItem("token");
        response = await fetch(API_URL + "/me", {
          method: "GET",
          headers: { "Authorization": "Bearer " + token }
        });
      } else {
        // Refresh failed too — user must login again
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        window.location.href = "index.html";
        return;
      }
    }

    var data = await response.json();

    if (response.ok) {
      document.getElementById("welcomeText").textContent = "Hello, " + data.username + "!";
      document.getElementById("username").textContent = data.username;
      document.getElementById("email").textContent = data.email;
      document.getElementById("userId").textContent = data.id;
      document.getElementById("avatar").textContent = data.username[0].toUpperCase();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.location.href = "index.html";
    }

  } catch (error) {
    alert("Cannot connect to server.");
  }
}



// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
async function forgotPassword() {
  var email = document.getElementById("email").value.trim();

  if (!email) {
    showMessage("Please enter your email.", "error");
    return;
  }

  var btn = document.getElementById("forgotBtn");
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    var response = await fetch(API_URL + "/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    });

    var data = await response.json();

    if (response.ok) {
      showMessage(data.message, "success");
    } else if (response.status === 429) {
      showMessage("Too many attempts. Please wait a minute.", "error");
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Send Reset Link";
}


// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
async function resetPassword() {
  var newPassword = document.getElementById("newPassword").value.trim();

  if (!newPassword) {
    showMessage("Please enter a new password.", "error");
    return;
  }

  // Reuse the password strength check from Task 1
  var strength = isPasswordStrong(newPassword);
  if (!strength.valid) {
    showMessage(strength.reason, "error");
    return;
  }

  // Get the token from the URL (e.g. ?token=xyz123)
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get("token");

  if (!token) {
    showMessage("Invalid or missing reset link.", "error");
    return;
  }

  var btn = document.getElementById("resetBtn");
  btn.disabled = true;
  btn.textContent = "Resetting...";

  try {
    var response = await fetch(API_URL + "/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token, new_password: newPassword })
    });

    var data = await response.json();

    if (response.ok) {
      showMessage(data.message + " Redirecting to login...", "success");
      setTimeout(function() {
        window.location.href = "index.html";
      }, 2000);
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Reset Password";
}


// ─── LOGOUT FUNCTION ──────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  window.location.href = "index.html";
}


// ─── AUTO-RUN: Load dashboard only on dashboard.html ─────────────────────────
// This checks which page we're on and runs the right function
if (window.location.pathname.includes("dashboard.html")) {
  loadDashboard();
}