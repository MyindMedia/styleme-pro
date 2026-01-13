# FitCheck

[![CI](https://github.com/MyindMedia/styleme-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/MyindMedia/styleme-pro/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB.svg)](https://reactnative.dev/)
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

> AI-Powered Wardrobe & Outfit Planning App

FitCheck helps you manage your wardrobe, plan outfits, and make smarter fashion decisions using AI-powered clothing recognition and style suggestions.

---

## Features

| Feature | Description |
|---------|-------------|
| **Smart Closet** | Digital wardrobe with detailed categorization |
| **AI Recognition** | Automatic item identification via image analysis or URL |
| **Outfit Generation** | AI-powered suggestions based on mood and occasion |
| **Wishlist Blend** | See how potential purchases match your wardrobe |
| **Trip Packing** | Smart packing lists based on weather and duration |
| **Style Tracking** | Calendar-based outfit logging with analytics |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Expo Go app (for mobile testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/MyindMedia/styleme-pro.git
cd styleme-pro

# Install dependencies
pnpm install

# Set up environment variables
# See ENV_SETUP.md for details

# Start development server
pnpm dev
```

### Running on Device

1. Install **Expo Go** on your iOS/Android device
2. Scan the QR code shown in terminal
3. App loads in Expo Go

### Running on Web

Visit `http://localhost:8081` after starting the dev server.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 |
| Styling | NativeWind 4 (Tailwind CSS) |
| Backend | Express + tRPC |
| Database | Supabase (PostgreSQL) |
| AI/LLM | Manus Forge API |

---

## Project Structure

```
fitcheck/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation screens
│   ├── add-item.tsx        # Add clothing item
│   ├── shuffle.tsx         # Outfit randomizer
│   ├── wishlist.tsx        # Wishlist with blend
│   └── packing.tsx         # Trip packing lists
├── components/             # Reusable UI components
├── lib/                    # Core utilities
├── hooks/                  # Custom React hooks
├── server/                 # Backend (Express + tRPC)
└── supabase/               # Database migrations
```

See [info.md](./info.md) for detailed documentation.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm check` | TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm build` | Build for production |

---

## Documentation

| Document | Description |
|----------|-------------|
| [info.md](./info.md) | Complete app documentation |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [ENV_SETUP.md](./ENV_SETUP.md) | Environment setup guide |
| [design.md](./design.md) | UI/UX specifications |

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code style guidelines
- Commit message conventions
- Pull request process

---

## License

This project is private and proprietary.

---

## Support

For questions or issues, please open a GitHub issue.
