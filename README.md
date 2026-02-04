# Battleship

A single-player Battleship game built with vanilla JavaScript and Vite.

## Game Rules

- 10x10 grid for both player and AI
- 5 ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Ships are placed randomly at game start
- Take turns firing at the enemy grid
- Sink all enemy ships to win

## Project Structure

```
battleship/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.js              # Entry point
│   ├── styles.css           # Game styling
│   ├── engine/
│   │   ├── board.js         # Board state, cell management
│   │   ├── ship.js          # Ship class and placement logic
│   │   └── game.js          # Game flow, turn management, win detection
│   ├── ai/
│   │   └── huntTarget.js    # Hunt/Target AI algorithm
│   └── ui/
│       ├── renderer.js      # Grid rendering, DOM updates
│       └── events.js        # Click handlers, user interactions
└── tests/
    ├── board.test.js        # Board validation tests
    └── game.test.js         # Win detection tests
```

## Running Locally

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

### Testing

Run the test suite:

```bash
npm test
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploying to GitHub Pages

### Option 1: Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Push the `dist` folder to the `gh-pages` branch:
   ```bash
   git subtree push --prefix dist origin gh-pages
   ```

### Option 2: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

3. Enable GitHub Pages in your repository settings:
   - Go to Settings > Pages
   - Set Source to "GitHub Actions"

The game will be available at `https://<username>.github.io/Battleship/`

## AI Strategy

The AI uses a Hunt/Target algorithm:

- **Hunt Mode**: Randomly selects cells to attack
- **Target Mode**: When a hit is registered, the AI targets adjacent cells to sink the ship

## License

ISC
