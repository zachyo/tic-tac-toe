# Stacks Tic Tac Toe

A decentralized PvP Tic Tac Toe game built on Stacks blockchain with STX betting.

## Features

- **On-chain gameplay** - All moves and game state stored on Stacks blockchain
- **STX betting** - Players bet STX tokens, winner takes all
- **Wallet integration** - Connect with Stacks wallet
- **Real-time updates** - Live game state tracking

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Blockchain**: Stacks blockchain, Clarity smart contracts
- **Wallet**: Stacks Connect

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd stacks-tic-tac-toe
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Connect Stacks wallet** and start playing!

## How to Play

1. **Create Game**: Set bet amount and make first move
2. **Join Game**: Another player joins with matching bet
3. **Play**: Take turns making moves
4. **Win**: Winner takes the entire pot

## Smart Contract Functions

- `create-game` - Start new game with bet
- `join-game` - Join existing game  
- `play` - Make a move in active game
- `get-game` - View game state

## Development

Built following the [LearnWeb3 Stacks Developer course](https://learnweb3.io/degrees/stacks-developer-degree/build-full-stack-apps-on-stacks/building-pv-p-onchain-tic-tac-toe/).

## License

MIT