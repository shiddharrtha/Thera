# Thera AI

**Treat only what needs treatment.**

Thera AI is a mobile crop scouting app for farmers. Scan crop rows with your phone, upload field videos, and receive AI-generated reports showing weeds, crop stress, problem zones, treatment recommendations, and estimated chemical savings.

## MVP Features

- Mobile crop scanning with guided walk-through UI
- AI field reports with weed/stress detection maps
- Scan history dashboard and field timeline
- Cost savings analytics
- Field map with layer toggles (weeds, stress, spray zones, scan path)
- Auth flow (login/signup) and settings/billing screens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) |
| Navigation | State-based screen flow (matches Figma prototype) |
| Charts/Maps | react-native-svg |
| Design | Ported from [Figma Make — Thera v1](https://www.figma.com/make/wUqfcb37Ns8LRaOGd3HXiu/Thera-v1) |

## Design Source

UI is implemented from the Figma Make prototype:
https://www.figma.com/make/wUqfcb37Ns8LRaOGd3HXiu/Thera-v1

Primary color: `#1B6B38` (agricultural green)

## Getting Started

```bash
npm install
npm start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## Screen Flow

```
Splash → Login/Sign Up → Home Dashboard
                              ↓
         Scan → Processing → Report → Field Map / Timeline
                              ↓
                    Savings Dashboard / Fields List / Settings
```

## Project Structure

```
src/
  components/     # BottomNav, HealthBar, HealthRing, FloatingInput
  screens/        # All MVP screens from Figma design
  theme/          # Design tokens (colors from Figma)
  types/          # Navigation types
App.tsx           # Root navigation matching Figma prototype flow
```

## Roadmap (Post-MVP)

- Python FastAPI backend for video upload & AI analysis
- YOLOv8 + OpenCV weed/crop stress detection
- Real camera integration (expo-camera)
- Cloud storage (AWS/GCP)
- Subscription billing integration
