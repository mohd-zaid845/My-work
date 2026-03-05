# 🛡️ SafeTrack – Safety Tracking App

A client-side safety tracking web application that lets you and your loved ones stay connected and safe. No server required — all data is stored locally in your browser.

## Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Register/login with email and password (client-side) |
| 🟢 **Safety Status** | Mark yourself as Safe, Caution, Alert, or Away |
| 🚨 **SOS Alerts** | One-tap emergency alert with 3-second countdown + cancel |
| ✅ **Safety Check-Ins** | Log your status with an optional note and location |
| 📍 **Location Capture** | Detect and record your GPS coordinates |
| ⏰ **Scheduled Reminders** | Set automatic browser reminders to check in regularly |
| 👥 **Emergency Contacts** | Add and manage contacts with name, phone, email, and relationship |
| 📋 **History Log** | Full filterable history of all check-ins, SOS alerts, and status changes |
| 📥 **Data Export** | Download all your data as a JSON file |

## Getting Started

1. **Clone or download** this repository.
2. Open `index.html` in any modern web browser — no build step required.
3. **Register** a new account with your name, email, and password.
4. **Add emergency contacts** in the Contacts tab.
5. Use the **Check-In** tab to log your status and detect your location.
6. Press **SOS** on the Dashboard in an emergency.

## File Structure

```
├── index.html          # Main HTML page
├── css/
│   └── style.css       # All styles (responsive, dark-safe)
├── js/
│   ├── storage.js      # localStorage abstraction layer
│   ├── contacts.js     # Emergency contacts module
│   ├── alerts.js       # SOS alert logic with countdown
│   ├── checkin.js      # Check-in + scheduled reminders
│   └── app.js          # Main app controller (auth, tabs, dashboard)
└── README.md
```

## Technology

- **Vanilla HTML5, CSS3, JavaScript (ES6+)** — zero dependencies, zero build tooling
- **localStorage** — all user data persists across browser sessions
- **Geolocation API** — optional GPS location capture
- **Notifications API** — optional browser push notifications for SOS and reminders

## Security Notes

> This app is a **client-side demo**. It stores all data in your browser's `localStorage`.
> - Passwords are hashed with a simple FNV-1a hash for demo purposes only.
> - For production use, replace this with a proper backend (bcrypt/Argon2 over HTTPS).
> - Do **not** enter real sensitive personal information in a demo environment.

## Screenshots

Open `index.html` in your browser to see the full UI including:
- Login / Registration screens
- Dashboard with safety status and SOS button
- Check-in form with location detection
- Emergency contacts management
- Filterable activity history

