// The address of our FastAPI backend
const API_URL = "https://authentication-system-4w2o.onrender.com";


// ─── HELPER: Show a message box ───────────────────────────────────────────────
function showMessage(text, type) {
  var messageBox = document.getElementById("message");
  messageBox.textContent = text;
  messageBox.className = "message " + type;
  messageBox.style.display = "block";
}


// ─── PASSWORD STRENGTH CHECK ──────────────────────────────────────────────────
function isPasswordStrong(password) {
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must include at least 1 uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must include at least 1 number." };
  }
  return { valid: true, reason: "" };
}

function checkPasswordStrength() {
  var passwordInput = document.getElementById("password") || document.getElementById("newPassword");
  var password = passwordInput.value;
  var hint = document.getElementById("passwordHint");

  var result = isPasswordStrong(password);

  if (password.length === 0) {
    hint.style.color = "#888";
    hint.textContent = "Must be 8+ characters, with 1 uppercase letter & 1 number";
  } else if (result.valid) {
    hint.style.color = "#16a34a";
    hint.textContent = "✓ Strong password!";
  } else {
    hint.style.color = "#dc2626";
    hint.textContent = result.reason;
  }
}


// ─── REGISTER FUNCTION ────────────────────────────────────────────────────────
async function register() {
  var username = document.getElementById("username").value.trim();
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  var strength = isPasswordStrong(password);
  if (!strength.valid) {
    showMessage(strength.reason, "error");
    return;
  }

  var btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    var response = await fetch(API_URL + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, email: email, password: password })
    });

    var data = await response.json();

    if (response.ok) {
      showMessage("Account created! Redirecting to login...", "success");
      setTimeout(function() {
        window.location.href = "index.html";
      }, 1500);
    } else if (response.status === 429) {
      showMessage("Too many attempts. Please wait a minute and try again.", "error");
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server. Is it running?", "error");
  }

  btn.disabled = false;
  btn.textContent = "Create Account";
}


// ─── LOGIN FUNCTION ───────────────────────────────────────────────────────────
async function login() {
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  var btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    var response = await fetch(API_URL + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",     // ← IMPORTANT: lets the browser store the cookies sent back
      body: JSON.stringify({ email: email, password: password })
    });

    var data = await response.json();

    if (response.ok) {
      // No more localStorage! Cookies are set automatically by the browser.
      window.location.href = "dashboard.html";
    } else if (response.status === 429) {
      showMessage("Too many login attempts. Please wait a minute and try again.", "error");
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server. Is it running?", "error");
  }

  btn.disabled = false;
  btn.textContent = "Login";
}


// ─── REFRESH THE ACCESS TOKEN ─────────────────────────────────────────────────
async function refreshAccessToken() {
  try {
    var response = await fetch(API_URL + "/refresh", {
      method: "POST",
      credentials: "include"    // sends the refresh_token cookie automatically
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}


// ─── MAKE AN AUTHENTICATED REQUEST (auto-refreshes token if expired) ─────────
async function authFetch(url, options) {
  options = options || {};
  options.credentials = "include";    // always send cookies

  var response = await fetch(url, options);

  if (response.status === 401) {
    var refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, options);
    }
  }

  return response;
}


// ─── LOAD DASHBOARD ───────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    var response = await authFetch(API_URL + "/me", { method: "GET" });

    if (!response.ok) {
      window.location.href = "index.html";
      return;
    }

    var data = await response.json();

    document.getElementById("welcomeText").textContent = "Hello, " + data.username + "!";
    document.getElementById("username").textContent = data.username;
    document.getElementById("email").textContent = data.email;
    document.getElementById("userId").textContent = data.id;

    if (data.profile_pic) {
      document.getElementById("avatarImg").src = "https://authentication-system-4w2o.onrender.com/" + data.profile_pic;
      document.getElementById("avatarImg").style.display = "block";
      document.getElementById("avatar").style.display = "none";
    } else {
      document.getElementById("avatar").textContent = data.username[0].toUpperCase();
    }

  } catch (error) {
    alert("Cannot connect to server.");
  }
}


// ─── LOGOUT FUNCTION ──────────────────────────────────────────────────────────
async function logout() {
  try {
    await fetch(API_URL + "/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    // even if this fails, still redirect
  }
  window.location.href = "index.html";
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

  var strength = isPasswordStrong(newPassword);
  if (!strength.valid) {
    showMessage(strength.reason, "error");
    return;
  }

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


// ─── UPDATE USERNAME ──────────────────────────────────────────────────────────
async function updateUsername() {
  var username = document.getElementById("username").value.trim();

  if (!username) {
    showMessage("Please enter a new username.", "error");
    return;
  }

  var btn = document.getElementById("updateUsernameBtn");
  btn.disabled = true;
  btn.textContent = "Updating...";

  try {
    var response = await authFetch(API_URL + "/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username })
    });

    var data = await response.json();

    if (response.ok) {
      showMessage("Username updated successfully!", "success");
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Update Username";
}


// ─── UPDATE PASSWORD ──────────────────────────────────────────────────────────
async function updatePassword() {
  var currentPassword = document.getElementById("currentPassword").value.trim();
  var newPassword = document.getElementById("newPassword").value.trim();

  if (!currentPassword || !newPassword) {
    showMessage("Please fill in both password fields.", "error");
    return;
  }

  var strength = isPasswordStrong(newPassword);
  if (!strength.valid) {
    showMessage(strength.reason, "error");
    return;
  }

  var btn = document.getElementById("updatePasswordBtn");
  btn.disabled = true;
  btn.textContent = "Updating...";

  try {
    var response = await authFetch(API_URL + "/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    var data = await response.json();

    if (response.ok) {
      showMessage("Password updated successfully!", "success");
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Update Password";
}


// ─── UPLOAD PROFILE PICTURE ────────────────────────────────────────────────────
async function uploadProfilePic() {
  var fileInput = document.getElementById("profilePicInput");
  var file = fileInput.files[0];

  if (!file) {
    showMessage("Please select an image first.", "error");
    return;
  }

  var btn = document.getElementById("uploadPicBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  var formData = new FormData();
  formData.append("file", file);

  try {
    var response = await fetch(API_URL + "/upload-profile-pic", {
      method: "POST",
      credentials: "include",   // sends cookies; no Authorization header needed anymore!
      body: formData
    });

    var data = await response.json();

    if (response.ok) {
      showMessage("Profile picture updated!", "success");
      showAvatarOnSettings(data.profile_pic);
    } else {
      showMessage(data.detail, "error");
    }

  } catch (error) {
    showMessage("Cannot connect to server.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Upload Photo";
}


// ─── HELPER: Show avatar image on settings page ───────────────────────────────
function showAvatarOnSettings(profilePicPath) {
  if (!profilePicPath) return;

  var img = document.getElementById("currentAvatar");
  var letterDiv = document.getElementById("currentAvatarLetter");

  img.src = "https://authentication-system-4w2o.onrender.com/" + profilePicPath;
  img.style.display = "block";
  letterDiv.style.display = "none";
}


// ─── LOAD CURRENT PROFILE INFO ON SETTINGS PAGE ───────────────────────────────
async function loadSettingsPage() {
  try {
    var response = await authFetch(API_URL + "/me", { method: "GET" });

    if (!response.ok) {
      window.location.href = "index.html";
      return;
    }

    var data = await response.json();

    document.getElementById("username").placeholder = "Current: " + data.username;
    showAvatarOnSettings(data.profile_pic);

    if (!data.profile_pic) {
      document.getElementById("currentAvatarLetter").textContent = data.username[0].toUpperCase();
    }

  } catch (error) {
    console.log("Could not load profile info.");
  }
}


// ─── AUTO-RUN: Load the right function based on which page we're on ──────────
if (window.location.pathname.includes("dashboard.html")) {
  loadDashboard();
}
if (window.location.pathname.includes("settings.html")) {
  loadSettingsPage();
}