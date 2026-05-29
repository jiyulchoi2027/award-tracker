# 🧭 Award Compass
### Congressional Award Tracker

A free web app to help students track their Congressional Award activities.
Built by a student, for students.

---

## About This Project

My name is Kyle (Jiyul) Choi, an 11th-grade student at Mill Creek High School in Hoschton, Georgia.

I moved to the United States from South Korea in January 2024. When I started the Congressional Award program, I quickly ran into a problem that nobody warned me about: keeping consistent, organized records across four different activity areas while adjusting to a new country, a new school, and a new language was harder than I expected.

I looked for an app that could help. I could not find one built specifically for the Congressional Award. So I decided to build it myself.

This project is my attempt to solve a real problem I faced, and to make the process easier for other students — especially those who, like me, are figuring things out as they go.

---

## What This App Does

Helps students track progress in all four Congressional Award areas:

| Area | Icon |
|------|------|
| Voluntary Public Service | 🤝 |
| Personal Development | 📚 |
| Physical Fitness | 💪 |
| Expedition & Exploration | 🧭 |

### Features

- 🧭 **Award Compass splash screen** with animated compass needle
- 📖 **In-app Quick Start Guide** with award requirements and usage tips
- 🗂 **3-level activity structure**: Goal → Activity Type → Log
- 📊 **Visual progress bars** with completion indicators and prior award tracking
- 🎉 **Completion alert** when a section reaches 100%
- 📅 **Program Start Date** — all logs validated against it
- 🗺 **Expedition tab** — day-by-day log, travel days handling, nights auto-calculated
- 📤 **CSV export** — all activity data including Expedition trips
- ⚙️ **Settings** — change name, level, or start date without losing data
- ☁️ **Firebase sync** — data synced across devices via Firestore
- 📱 **Mobile responsive** design
- 🔒 **XSS protection** on all user inputs

---

## Award Level Requirements

| Level | Public Service | Development | Fitness | Expedition |
|-------|---------------|-------------|---------|------------|
| Bronze Certificate | 30 hrs | 15 hrs | 15 hrs | 1 day |
| Silver Certificate | 60 hrs | 30 hrs | 30 hrs | 2 days |
| Gold Certificate | 90 hrs · 6 mo | 45 hrs · 6 mo | 45 hrs · 6 mo | 3 days |
| Bronze Medal | 100 hrs · 7 mo | 50 hrs · 7 mo | 50 hrs · 7 mo | 2 days · 1 night |
| Silver Medal | 200 hrs · 12 mo | 100 hrs · 12 mo | 100 hrs · 12 mo | 3 days · 2 nights |
| Gold Medal | 400 hrs · 24 mo | 200 hrs · 24 mo | 200 hrs · 24 mo | 5 days · 4 nights |

---

## Taking It Further

Building the app was only the beginning. In April 2026, I contacted the Congressional Award Foundation directly to share this idea and ask for guidance. I also pre-registered for the 2026 Congressional App Challenge and wrote to my congressional representative requesting that GA-09 participate in the competition.

I am currently a Silver Medal candidate and plan to pursue the Gold Medal before graduation.

---

## Development Log

| Version | Date | Update |
|---------|------|--------|
| v0.1 | April 2026 | First HTML structure |
| v0.2 | April 2026 | CSS design and card layout |
| v0.3 | May 2026 | Activity input and photo upload |
| v0.4 | May 2026 | Save data with localStorage |
| v0.5 | May 2026 | All 6 award level requirements |
| v0.6 | May 2026 | Setup screen with level selection |
| v0.7 | May 2026 | CSV export feature |
| v0.8 | May 2026 | Month requirements per level |
| v0.9 | May 2026 | Auto update badges by level |
| v0.10 | May 2026 | Goal modal with validator input |
| v0.11 | May 2026 | Display saved goals in cards |
| v0.12 | May 2026 | Goal count limit per section |
| v0.13 | May 2026 | Goal delete function |
| v0.14 | May 2026 | Mobile responsive design |
| v1.0 | May 2026 | 3-level structure (Goal → Activity Type → Log), settings modal, edit/delete all levels |
| v1.1 | May 2026 | Tab navigation, Expedition day-by-day log, travel days handling, program start date, completion alert, XLSX export, Award Compass splash screen, in-app guide overlay |
| v1.2 | May 2026 | XSS security fix, bug fixes (expedition activity modal, timezone date bug), mobile guide responsive, app renamed to Award Compass |
| v1.5 | May 2026 | Firebase sync, prior award tracking, header start date, CSV expedition export, ESC/backdrop modal close, photo removed (Submittable notice), auth error handling, safe JSON parse |
| v1.6 | May 2026 | XSS fix (expedition fields), timezone fix, debounce sync, toast notification, Gold prior fix, updateDisplay guard, deleteTrip modal fix, log hours step 0.25, input maxlength |

---

## About the Developer

**Jiyul Choi (Kyle)**
Mill Creek High School, Class of 2026
Hoschton, Georgia
Congressional Award Silver Medal Candidate