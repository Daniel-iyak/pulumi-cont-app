# Pulumi Container Application

This project demonstrates a web application deployment using Pulumi and AWS ECS. The application runs in a container and displays a configurable message on its web page.

## Project Structure

```bash
pulumi-cont-app/
├── app/                    # Web application code
│   ├── Dockerfile         # Container definition
│   ├── package.json       # Node.js dependencies
│   ├── server.js          # Express.js web application
│   └── README.md          # Application documentation
│
└── infra/                 # Infrastructure code
    ├── index.ts           # Main Pulumi program
    ├── ecs-service.ts     # ECS service component
    ├── build-and-push.sh  # Image build script
    ├── package.json       # Pulumi dependencies
    └── README.md          # Infrastructure documentation
```

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [Docker](https://www.docker.com/get-started) for building the container image
- Node.js and npm for dependencies

## Getting Started

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd pulumi-cont-app
   ```

2. Set up the web application:

   ```bash
   cd app
   npm install
   ```

3. Set up the infrastructure:

   ```bash
   cd app
   npm install
   ```

4. Set up the infrastructure:

   ```bash
   cd ../infra
   npm install
   ```

5. Configure Pulumi:

   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set webMessage "Hello from Pulumi!"
   ```

6. Build and deploy:

   ```bash
   ./build-and-push.sh
   pulumi up
   ```

## Development

- `app/` contains the web application code
- `infra/` contains the Pulumi infrastructure code
- Each directory has its own `package.json` and `README.md`

## Configuration

The application can be configured through Pulumi config values in `infra/Pulumi.dev.yaml`:

```yaml
config:
  aws:region: us-east-1
  webMessage: "Hello from Pulumi ECS!"
  vpcCidr: 10.0.0.0/16
  containerPort: 8080
  containerCpu: 256
  containerMemory: 512
  desiredCount: 2
```

## Cleanup

To destroy all resources:

```bash
cd infra
pulumi destroy
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
