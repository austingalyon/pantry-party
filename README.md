# 🎉 Pantry Party

Raid your pantries and party together! A collaborative recipe generation web app built with Astro, Convex.dev, TailwindCSS, and OpenAI.

## Features

- 🥗 **Collaborative Ingredient Lists**: Multiple users can add ingredients via text, voice, or photo
- 🤖 **AI-Powered Recipe Generation**: OpenAI generates personalized recipes based on your ingredients
- 🗳️ **Group Voting**: Vote together on your favorite recipes
- ⚡ **Real-time Updates**: Convex provides live synchronization across all participants
- 🎨 **Beautiful UI**: Modern, responsive design with TailwindCSS

## Tech Stack

- **[Astro](https://astro.build/)** - Modern web framework
- **[Convex](https://convex.dev/)** - Real-time backend and database
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS
- **[OpenAI](https://openai.com/)** - AI recipe generation
- **TypeScript** - Type-safe development

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account (free at [convex.dev](https://convex.dev))
- OpenAI API key

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and add your OpenAI API key:
   ```
   CONVEX_DEPLOYMENT=<auto-filled-by-convex>
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:4321`

## Project Structure

```
pantry-party/
├── src/
│   ├── components/       # React islands for interactive UI
│   ├── layouts/          # Astro layout components
│   └── pages/            # Astro pages & routes
├── convex/               # Convex backend functions
│   ├── schema.ts         # Database schema
│   ├── rooms.ts          # Room management
│   ├── ingredients.ts    # Ingredient handling
│   ├── constraints.ts    # Dietary constraints
│   ├── recipes.ts        # Recipe CRUD
│   ├── votes.ts          # Voting system
│   └── recipeGeneration.ts  # OpenAI integration
└── public/               # Static assets
```

## Usage

1. Create or join a room
2. Add ingredients collaboratively
3. Set dietary constraints and preferences
4. Generate AI-powered recipes
5. Vote on your favorites
6. Cook together!

## License

MIT
