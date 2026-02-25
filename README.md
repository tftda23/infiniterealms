# Infinite Realms

> [!CAUTION]
> **Early Access / Alpha Release**: This project is in very early development. Expect bugs, breaking changes, and evolving features. We welcome feedback and bug reports!

AI-powered solo Dungeons & Dragons 5th Edition experience.

## Features

- **AI Dungeon Master** - GPT-4 powered DM with tool-calling for game mechanics
- **Character Management** - Create and manage D&D 5e characters
- **D&D Beyond Sync** - Import and sync characters from D&D Beyond
- **Combat System** - Initiative tracking, HP management, turn order
- **Quest & NPC Tracking** - Automatic tracking of encountered NPCs and quests
- **Scene Image Generation** - DALL-E 3 generated scene images
- **Text-to-Speech** - Browser-based voice narration for DM responses
- **Rules Enforcement** - Configurable RAW enforcement levels

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, Tailwind CSS, Radix UI
- **AI**: OpenAI GPT-4o, DALL-E 3 (via Vercel AI SDK)
- **Database**: PostgreSQL
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- OpenAI API key

### Installation (via CLI)

You can install Infinite Realms globally and run it directly:

```bash
# Using npm
npm install -g infinite-realms

# Using yarn
yarn global add infinite-realms
```

Then start the application from anywhere:

```bash
infinite-realms
```

### Manual Installation (Development)

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/your-username/infinite-realms.git
   cd infinite-realms
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your database URL and optionally your OpenAI API key.

3. Set up the database:
   ```bash
   # Create the database
   createdb dndsolo

   # Run the app and hit the "Setup DB" button, or:
   npm run db:schema
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## License

Infinite Realms is licensed under a custom agreement. It is free to use and we welcome contributions. However, modification for redistribution and direct redistribution of the software are not permitted. Infinite Realms reserves the exclusive right to provide hosted versions of the software.

See the [LICENSE](LICENSE) file for the full terms.

## Contributing

We love contributions! Since this is an early-stage project, the best ways to help are:
1. **Bug Reports**: Open an issue if something doesn't work.
2. **Feature Ideas**: Suggest new tools or DM personalities.
3. **Pull Requests**: Submit improvements to the DM engine or UI.

*Note: By contributing, you agree to license your work under the terms of the Infinite Realms License.*
