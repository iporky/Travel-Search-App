# Travel Search App

An intelligent AI-powered travel assistant and exploration mobile application built with React Native and Expo. The app helps travelers discover destinations, find local events, explore culture, get instant answers through natural language voice and text search, and manage travel perks.

## Features

- **AI Travel Search & Chat**: Conversational AI assistant providing recommendations, itinerary ideas, local tips, and source citations.
- **Voice-Activated Exploration**: Integrated voice search powered by Expo Speech Recognition.
- **Interactive Home & Trending Topics**: Curated travel highlights, local trends across 10 locales, and quick actions.
- **Event Discovery**: Search and filter local cultural festivals, music events, and gatherings.
- **Cashback & Voucher Workflow**: Upload travel receipts, calculate rewards, and claim local vouchers.
- **Multi-Language Localization**: Full i18n support across 10 languages (English, German, Spanish, French, Japanese, Korean, Thai, Vietnamese, Simplified Chinese, Traditional Chinese).
- **Personalized Onboarding**: Tailored recommendations based on travel interests, travel purpose, and background.
- **Smooth Reanimated Motion**: Built with React Native Reanimated for fluid, 60 FPS transitions and micro-interactions.

## Tech Stack

- **Framework**: React Native 0.81 (New Architecture enabled), Expo SDK 54
- **Language**: TypeScript
- **Animations**: React Native Reanimated 4
- **State & Storage**: AsyncStorage, React Context
- **Localization**: i18next & react-i18next
- **Authentication**: Firebase Auth (Google & Facebook Sign-In)
- **Audio & Speech**: Expo Speech Recognition & React Native Voice
- **Icons & Graphics**: React Native SVG, Expo Vector Icons

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Android Studio / Xcode (for running native emulators or builds)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iporky/Travel-Search-App.git
   cd Travel-Search-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and configure your API host if needed:
   ```bash
   cp .env.example .env
   ```

### Running the App

Start the Expo development server:
```bash
npm start
```

Run on an Android device or emulator:
```bash
npm run android
```

Run on an iOS simulator (macOS required):
```bash
npm run ios
```

## License

This project is proprietary and confidential.
