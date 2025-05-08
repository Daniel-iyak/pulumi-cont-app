# Infrastructure as Code

This directory contains the Pulumi infrastructure code for deploying the web application to AWS ECS.

## Architecture

The infrastructure is built using a secure, production-ready architecture:

- **Container Service**: AWS ECS with Fargate
- **Networking**:
  - VPC with public and private subnets
  - Application Load Balancer in public subnets
  - ECS tasks running in private subnets
  - NAT Gateway for outbound internet access
- **Security**:
  - Security groups controlling traffic
  - IAM roles with least privilege
  - Private subnets for application isolation
- **Monitoring**:
  - CloudWatch Logs integration
  - Health checks via ALB

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- Node.js and npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure Pulumi:

   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set webMessage "Hello from Pulumi!"
   ```

3. Build and push the Docker image:

   ```bash
   ./build-and-push.sh
   ```

4. Deploy the infrastructure:

   ```bash
   pulumi up
   ```

## Configuration

The infrastructure can be configured through Pulumi config values in `Pulumi.dev.yaml`:

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

## Components

- `index.ts`: Main Pulumi program
- `ecs-service.ts`: ECS service component
- `build-and-push.sh`: Script to build and push Docker image

## Cleanup

To destroy all resources:

```bash
pulumi destroy
```

## License

MIT License
