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
- OpenAI API key (or other supported LLM provider)

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
   git clone https://github.com/tftda23/infiniterealms.git
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

## How to Play

### 1. Initial Setup (LLM Token)
Once you access the web application, you must first configure your AI provider.
- Go to the **Settings** page.
- Enter your API token for your preferred provider (OpenAI, Anthropic, etc.).
- Click **Save Settings**.

### 2. Create a Campaign
- From the Home page, click **Create New Campaign**.
- Define your world setting, DM personality, and rules enforcement level.

<!-- ![Create Campaign Placeholder](https://via.placeholder.com/800x400?text=Create+Campaign+Interface) -->

### 3. Add Characters
- Within your campaign, add your player characters.
- You can create them manually or import them directly from **D&D Beyond**.

<!-- ![Character Sheet Placeholder](https://via.placeholder.com/800x400?text=Character+Management) -->

### 4. Begin Adventure
- Once your party is ready, click **Begin Adventure**.
- Start chatting with the DM to begin your story!

<!-- ![Gameplay Placeholder](https://via.placeholder.com/800x400?text=Gameplay+Interface) -->

## Security & Token Usage

### Security Measures
- **Local Storage**: Your API tokens are encrypted and stored in your local PostgreSQL database.
- **Encryption**: We use AES-256 encryption to protect your tokens at rest.
- **Server-Side Only**: Tokens are never sent to the client browser after they are saved; they are only used server-side to communicate with the LLM providers.

### Liability & Risk
- **User Responsibility**: Usage of your token is entirely at your own choice.
- **Cost Disclaimer**: Infinite Realms accepts **no liability** for costs incurred due to the usage of the application with your own LLM token. AI usage can be expensive; monitor your usage dashboards on your provider's website.
- **Risk Acceptance**: By using this application, the user accepts all risks associated with API token usage and security.
- **Recommendation**: We strongly advise using **short-lived tokens** or setting **usage limits** on your AI provider's dashboard to prevent unexpected costs.

## License

Infinite Realms is licensed under a custom agreement. It is free to use and we welcome contributions. However, modification for redistribution and direct redistribution of the software are not permitted. Infinite Realms reserves the exclusive right to provide hosted versions of the software.

See the [LICENSE](LICENSE) file for the full terms.

## Contributing

We love contributions! Since this is an early-stage project, the best ways to help are:
1. **Bug Reports**: Open an issue if something doesn't work.
2. **Feature Ideas**: Suggest new tools or DM personalities.
3. **Pull Requests**: Submit improvements to the DM engine or UI.

*Note: By contributing, you agree to license your work under the terms of the Infinite Realms License.*
