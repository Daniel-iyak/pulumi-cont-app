# Web Application

A simple Express.js web application that displays a configurable message. This application is containerized and deployed to AWS ECS.

## Features

- Express.js web server
- Environment variable configuration
- Docker containerization
- Health check endpoint

## Prerequisites

- Node.js (>= 14)
- npm (>= 6)
- Docker

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file:

   ```bash
   PORT=8080
   HOST=0.0.0.0
   MESSAGE=Hello from local development!
   ```

3. Run the application:

   ```bash
   npm start
   ```

4. Access the application:

   ```bash
   http://localhost:8080
   ```

## Docker

Build and run the container:

```bash
# Build the image
docker build -t web-app .

# Run the container
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e HOST=0.0.0.0 \
  -e MESSAGE="Hello from Docker!" \
  web-app
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port to listen on | 8080 |
| HOST | Host to bind to | 0.0.0.0 |
| MESSAGE | Message to display | "hello world" |

## Testing

The application includes a health check endpoint at `/` that returns the configured message.

## License

MIT License
