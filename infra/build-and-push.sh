#!/bin/bash

# Get AWS region from AWS CLI configuration
AWS_REGION=$(aws configure get region)

# Get the ECR repository URL from Pulumi output
REPO_URL=$(pulumi stack output repositoryUrl)

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${REPO_URL}

# Create and use a new builder instance
docker buildx create --use

# Build and push the Docker image for AMD64 (required by Fargate)
docker buildx build --platform linux/amd64 \
    -t ${REPO_URL}:latest \
    --push \
    ../app 