# Unified Security Access Gateway (USAG)



![Python](https://img.shields.io/badge/python-3.12-blue.svg)

![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)

![React](https://img.shields.io/badge/React-18-blue.svg)

![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8.svg)

![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey.svg)

![License](https://img.shields.io/badge/license-MIT-blue.svg)



> **A Next-Gen Identity & Access Management (IAM) and Mini-SIEM platform that enforces Zero Trust principles using Adaptive Auth, Real-time Threat Visualization, and AI-driven Policy Enforcement.**



---



## 🎯 Overview



USAG is a comprehensive security platform that combines enterprise-grade authentication, real-time threat monitoring, automated incident response, and AI-powered policy management into a single unified system. Built with modern web technologies and following NIST cybersecurity frameworks, it provides security teams with the tools needed to protect digital assets in an increasingly complex threat landscape.



---



## 🏗️ Core Modules



### 1. Authentication & Access Control (The Gatekeeper)



#### 🛡️ Adaptive Authentication

Context-aware login system that fingerprints **Device**, **IP Address**, and **Geographic Location**. The system builds a trust profile for each user:

- **Trusted Context:** If device, IP, and location match previous successful logins → MFA is **skipped** for faster, seamless access.

- **Suspicious Context:** Any change in device, IP, or location → MFA is **automatically triggered** to verify identity.



#### 🔐 Brute Force Protection

Multi-layered defense against credential stuffing attacks:

- **Custom IP-based Rate Limiting:** Tracks failed login attempts per IP address in real-time.

- **Google reCAPTCHA v2 Integration:** After 3 failed attempts, users must complete a CAPTCHA challenge.



#### 🔑 Multi-Factor Authentication (MFA)

- **TOTP (Time-based One-Time Password):** Industry-standard 6-digit codes generated via authenticator apps (Google Authenticator, Authy, etc.).

- **Enforcement:** Required for high-risk logins, new devices, or when triggered by security rules.

- **Setup Flow:** Seamless QR code generation and verification during first-time setup.



#### ⏳ Idle Session Timeout
Proactive session management to prevent unauthorized access to unattended workstations:
- **Activity Monitoring:** Continuously tracks user interaction (mouse movements, keystrokes).
- **Auto-Logout:** Automatically terminates the session after **15 minutes** of inactivity.
- **Feedback:** Redirects the user to the login screen with a "Session Expired" alert.



#### 🚧 Role-Based Access Control (RBAC)

Strict separation between user roles prevents unauthorized lateral movement:

- **Admin Dashboard:** Full access to security logs, user management, threat visualization, and rule configuration.

- **Employee Dashboard:** Limited access to personal mockup activity of a some kind of ERP.

- **Route Protection:** Client-side and server-side enforcement ensures users cannot access unauthorized routes by URL manipulation.



---



### 2. SIEM & Monitoring (The Watchtower)



#### 📊 NIST Risk Scoring Matrix

Replaces arbitrary scoring systems with the official **NIST SP 800-30** Risk Assessment Framework:



**Formula:** `Risk Score = Likelihood (1-5) × Impact (1-5)`



**Score Range:** 1-25



| Likelihood | Impact | Risk Score | Severity |

|------------|--------|------------|----------|

| 1 (Rare) | 1 (Negligible) | 1 | Very Low |

| 3 (Possible) | 3 (Moderate) | 9 | Moderate |

| 4 (Likely) | 4 (Major) | 16 | High |

| 5 (Almost Certain) | 5 (Critical) | 25 | Critical |



**Examples:**

- **Successful Login (Trusted Device):** L=1, I=1 → **Risk = 1**

- **Bad Password Attempt:** L=3, I=3 → **Risk = 9**

- **MFA Failure:** L=4, I=4 → **Risk = 16**

- **Impossible Travel:** L=5, I=5 → **Risk = 25** (BLOCKED)



#### 🌍 3D Live Threat Map

Interactive WebGL-powered globe visualization using `react-globe.gl`:

- **Real-Time Visualization:** Active user sessions appear as **green markers**, critical threats as **red markers**.

- **Geographic Context:** Each marker shows country, city, and IP address.

- **Drill-Down Details:** Click any marker to view full session details, risk score, and activity timeline.

- **Auto-Updates:** Map refreshes automatically as new events occur.



#### ⚡ Real-Time Log Streaming

Powered by **WebSocket** technology for instant updates:

- **Zero Polling:** No need to refresh the page or wait for API calls.

- **Instant Notifications:** New security events appear on the dashboard within milliseconds.

- **Session Updates:** Active session changes (logins, logouts, terminations) broadcast immediately to all connected admin clients.



#### 📈 Traffic Analytics

Interactive data visualizations powered by **Recharts**:

- **Risk Events by Type:** Bar chart showing the most frequent security triggers (filtered for Risk > 5).

- **Top Threat Origins:** Geographic distribution of high-risk events (Risk ≥ 15) by country.

- **Trend Analysis:** Historical patterns help identify emerging threats and attack vectors.



---



### 3. Incident Response (The Enforcer)



#### 🚫 Impossible Travel Detection (Geo-Velocity)

Advanced geolocation anomaly detection using the **Haversine Formula**:



**How It Works:**

1. System records the user's last login location (latitude, longitude).

2. When a new login occurs, it calculates the **distance** between the two points.

3. Calculates the **speed** required to travel that distance in the time elapsed.

4. **If speed > 900 km/h** → Login is **automatically BLOCKED** (Risk Score: 25).



**Example:**

- User logs in from **London** at 10:00 AM.

- User attempts login from **Tokyo** at 11:00 AM (1 hour later).

- Distance: ~9,560 km

- Required Speed: 9,560 km/h → **BLOCKED** (impossible for human travel).



#### 💀 Kill Switch (Force Logout)

Instant session termination capability:

- **One-Click Termination:** Admins can terminate any active session from the dashboard.

- **WebSocket Push:** Backend sends a `FORCE_LOGOUT` packet to the target user's WebSocket connection.

- **Millisecond Response:** User is logged out and redirected to login page within milliseconds.

- **Security:** Admins cannot terminate their own session (prevents lockout).



#### 🏴 Blacklist & Lock

Rapid response mechanisms for immediate threat containment:



**IP Blacklisting:**

- One-click ban of malicious IP addresses.

- All future requests from blacklisted IPs are automatically rejected.

- Includes reason tracking and timestamp.



**User Account Locking:**

- Instant account lockout for compromised or suspicious accounts.

- Prevents further login attempts until admin unlock.

- Triggers immediate session termination for that user.



#### 🔍 Investigation Module

Deep-dive analysis tool for security incidents:

- **User Activity Timeline:** Complete history of all login attempts, locations, and risk scores.

- **Risk Score Evolution:** Visual timeline showing how risk scores changed over time.

- **Metadata Inspection:** Full access to log metadata including device fingerprints, user agents, and geographic data.

- **Status Management:** Mark incidents as "INVESTIGATING", "RESOLVED", or "FALSE_POSITIVE".



---



### 4. AI Automation (The Brain)



#### 🧠 Natural Language Rule Engine

Integrated with **Google Gemini AI** to convert human language into security policies:



**How It Works:**

1. Admin types a natural language request: *"Block all logins from North Korea"*

2. AI parses the request and converts it to structured JSON:

   ```json

   {

     "name": "Block North Korea",

     "field": "country",

     "operator": "equals",

     "value": "KP",

     "action": "BLOCK",

     "rule_likelihood": 5,

     "rule_impact": 5

   }

