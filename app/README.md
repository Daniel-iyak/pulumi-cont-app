# Node.js Application

A simple Node.js application that runs in a container and displays a configurable message.

## Prerequisites

- Node.js 18 or later
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with the following variables:

   ```env
   PORT=8080
   HOST=0.0.0.0
   MESSAGE=Hello from local development!
   ```

## Development

Run the application locally:

```bash
npm start
```

The application will be available at <http://localhost:8080>

## Endpoints

- `GET /`: Returns the configured message
- `GET /health`: Health check endpoint, returns 200 OK

## Docker

Build the Docker image:

```bash
docker build -t app:latest .
```

Run the container:

```bash
docker run -p 8080:8080 -e MESSAGE="Hello from Docker!" app:latest
```

## Environment Variables

- `PORT`: The port the application listens on (default: 8080)
- `HOST`: The host to bind to (default: 0.0.0.0)
- `MESSAGE`: The message to display (default: "hello world")

## Deployment

The application is designed to be deployed to AWS ECS using the Pulumi infrastructure in the `infra` directory. See the infrastructure README for deployment instructions.

## License

MIT License
