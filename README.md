# argochain index
A data ingestion tool made specifically for the Argochain ecosystem.

This project is designed to ingest data from the blockchain and store it in a PostgreSQL database. It uses WebSocket for real-time data fetching, and PM2 for process management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Docker Setup](#docker-setup)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed on your machine
- Docker and Docker Compose installed
- PostgreSQL installed and running

Step 1: Set Up PostgreSQL Database

First, create the necessary tables in PostgreSQL to store the data.

CREATE TABLE blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL,
    parent_hash VARCHAR(66) NOT NULL,
    state_root VARCHAR(66) NOT NULL,
    extrinsics_root VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX idx_blocks_hash ON blocks(block_hash);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(block_number),
    section VARCHAR(255) NOT NULL,
    method VARCHAR(255) NOT NULL,
    data JSONB NOT NULL
);

CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_events_section_method ON events(section, method);

CREATE TABLE transactions (
    original_tx_hash VARCHAR(66) PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT REFERENCES blocks(block_number),
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    amount DECIMAL(38, 18) NOT NULL,
    fee DECIMAL(38, 18) NOT NULL,
    gas_fee DECIMAL(38, 18) NOT NULL,
    gas_value DECIMAL(38, 18) NOT NULL,
    method VARCHAR(255) NOT NULL,
    events JSONB NOT NULL
);

CREATE INDEX idx_transactions_block_number ON transactions(block_number);
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_to_address ON transactions(to_address);

CREATE TABLE accounts (
    address VARCHAR(66) PRIMARY KEY,
    balance DECIMAL(38, 18) NOT NULL
);

CREATE INDEX idx_accounts_balance ON accounts(balance);

CREATE TABLE extrinsics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    weight BIGINT NOT NULL
);

CREATE TABLE gas_fees (
    id SERIAL PRIMARY KEY,
    extrinsic_id INTEGER REFERENCES extrinsics(id),
    gas_fee DECIMAL(38, 18) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Step 2: Set Up Node.js Project with TypeScript

### Initialize Project


    ```bash
    mkdir project-root
    cd project-root
    npm init -y
    npm install typescript ts-node @types/node --save-dev
    npm install pg ws express body-parser dotenv
    npx tsc --init
    ```



## Configure Environment Variables (.env)


    ```bash
    PG_HOST=your_postgres_host
    PG_PORT=your_postgres_port
    PG_DATABASE=your_database_name
    PG_USER=your_database_user
    PG_PASSWORD=your_database_password
    WS_URL=wss://your_blockchain_node_ws_endpoint
    PORT=3000
    ```


## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/blockchain-ingestion.git
    cd blockchain-ingestion
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

3. Initialize TypeScript:

    ```bash
    npx tsc --init
    ```

## Configuration

1. Create a `.env` file in the root of your project and add your configuration variables:

    ```env
    DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database
    WS_URL=wss://your_blockchain_node_ws_endpoint
    PORT=3000
    ```

## Usage

1. To start the server with PM2:

    ```bash
    npm run start
    ```

2. To start the server without PM2:

    ```bash
    npx ts-node src/index.ts
    ```

## Docker Setup

### Dockerfile for Node.js Application

1. Create a file named `Dockerfile` in the root of your project:

    ```Dockerfile
    # Use the official Node.js 18 image
    FROM node:18

    # Create and change to the app directory
    WORKDIR /usr/src/app

    # Copy package.json and package-lock.json
    COPY package*.json ./

    # Install dependencies
    RUN npm install

    # Install PM2 globally
    RUN npm install pm2 -g

    # Copy the rest of the application code
    COPY . .

    # Build the TypeScript files
    RUN npm run build

    # Expose the port the app runs on
    EXPOSE 3000

    # Start the application with PM2
    CMD ["pm2-runtime", "start", "ecosystem.config.js"]
    ```

### Dockerfile for PostgreSQL

1. Create a file named `Dockerfile.postgres` in the root of your project:

    ```Dockerfile
    # Use the official PostgreSQL 14 image
    FROM postgres:14

    # Set environment variables
    ENV POSTGRES_USER=your_database_user
    ENV POSTGRES_PASSWORD=your_database_password
    ENV POSTGRES_DB=your_database_name

    # Expose the default PostgreSQL port
    EXPOSE 5432
    ```

### Docker Compose Configuration

1. Create a file named `docker-compose.yml` in the root of your project:

    ```yaml
    version: '3.8'

    services:
      db:
        build:
          context: .
          dockerfile: Dockerfile.postgres
        environment:
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        ports:
          - "5432:5432"
        volumes:
          - pgdata:/var/lib/postgresql/data

      app:
        build: .
        command: npm run start
        volumes:
          - .:/usr/src/app
          - /usr/src/app/node_modules
        ports:
          - "3000:3000"
        depends_on:
          - db

    volumes:
      pgdata:
    ```

2. Build and start the Docker containers:

    ```bash
    docker-compose build
    docker-compose up
    ```

## API Endpoints

### Blocks

- **GET /api/blocks/:blockNumber** - Fetch a block by its number
- **GET /api/blocks** - List the latest 10 blocks

### Transactions

- **GET /api/transactions/:txHash** - Fetch a transaction by its hash
- **GET /api/transactions** - List the latest 10 transactions

### Tokens

- **GET /api/tokens/:tokenId** - Fetch a token by its ID
- **GET /api/tokens** - List the latest 10 tokens

### Contracts

- **GET /api/contracts/:contractAddress** - Fetch a contract by its address
- **GET /api/contracts** - List the latest 10 contracts

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b my-feature-branch`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin my-feature-branch`.
5. Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
