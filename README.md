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
    ├── components/        # Pulumi components
    ├── config/           # Configuration files
    ├── utils/            # Utility functions
    └── README.md         # Infrastructure documentation
```

## Prerequisites

- [Pulumi CLI](<https://www.pulumi.com/docs/install/>)
- [AWS CLI](<https://aws.amazon.com/cli/>) configured with appropriate credentials
- [Docker](<https://www.docker.com/get-started>) for building the container image
- Node.js 18 or later

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
   cd ../infra
   npm install
   ```

4. Configure Pulumi:

   ```bash
   pulumi config set infra-test:webMessage "Hello from Pulumi!"
   pulumi config set infra-test:environment dev
   pulumi config set infra-test:project pulumi-app
   ```

5. Build and deploy:

   ```bash
   # Build and push the Docker image
   cd ../app
   docker build -t $(pulumi stack output repositoryUrl):latest .
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(pulumi stack output repositoryUrl)
   docker push $(pulumi stack output repositoryUrl):latest

   # Deploy the infrastructure
   cd ../infra
   pulumi up
   ```

## Configuration

The application can be configured through Pulumi config values:

```bash
# Required
pulumi config set infra-test:webMessage "Your message here"

# Optional (with defaults)
pulumi config set infra-test:environment dev
pulumi config set infra-test:project pulumi-app
pulumi config set infra-test:vpcCidr 10.0.0.0/16
pulumi config set infra-test:containerPort 8080
pulumi config set infra-test:containerCpu 256
pulumi config set infra-test:containerMemory 512
pulumi config set infra-test:desiredCount 2
pulumi config set infra-test:albPort 80
```

## Development

- `app/` contains the web application code
- `infra/` contains the Pulumi infrastructure code
- Each directory has its own `package.json` and `README.md`

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
