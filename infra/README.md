# Pulumi Infrastructure

This directory contains the Pulumi infrastructure code for deploying a containerized application to AWS ECS.

## Prerequisites

- Node.js 18 or later
- AWS CLI configured with appropriate credentials
- Pulumi CLI installed
- Docker installed

## Configuration

The infrastructure can be configured using Pulumi config values. Here are the available configuration options:

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

## Deployment

1. Build and push the Docker image:

```bash
cd ../app
docker build -t $(pulumi stack output repositoryUrl):latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(pulumi stack output repositoryUrl)
docker push $(pulumi stack output repositoryUrl):latest
```

1. Deploy the infrastructure:

```bash
cd ../infra
pulumi up
```

## Architecture

The infrastructure consists of:

- VPC with public and private subnets
- ECS Fargate cluster
- Application Load Balancer
- ECR repository for container images
- Security groups for ALB and ECS tasks
- CloudWatch log groups for container logs

## Outputs

After deployment, the following outputs are available:

- `vpcId`: The ID of the created VPC
- `publicSubnetIds`: List of public subnet IDs
- `privateSubnetIds`: List of private subnet IDs
- `clusterArn`: ECS cluster ARN
- `serviceName`: ECS service name
- `loadBalancerDnsName`: ALB DNS name
- `repositoryUrl`: ECR repository URL

## Cleanup

To destroy all resources:

```bash
pulumi destroy
```

## License

MIT License
