import * as pulumi from "@pulumi/pulumi";
import { VpcComponent } from "./components/vpc";
import { EcsComponent } from "./components/ecs";
import { AlbComponent } from "./components/alb";
import { SecurityGroupComponent } from "./components/security";
import { EcrComponent } from "./components/ecr/ecr";
import { defaultConfig } from "./config/defaults";

// Get configuration values
const config = new pulumi.Config("infra-test");
const webMessage = config.require("webMessage");
const environment = config.get("environment") || "dev";
const project = config.get("project") || "pulumi-app";

// VPC Configuration
const vpcCidr = config.get("vpcCidr") || "10.0.0.0/16";
const enableDnsSupport = config.getBoolean("enableDnsSupport") ?? true;
const enableDnsHostnames = config.getBoolean("enableDnsHostnames") ?? true;

// Container Configuration
const containerPort = config.getNumber("containerPort") || 8080;
const containerCpu = config.getNumber("containerCpu") || 256;
const containerMemory = config.getNumber("containerMemory") || 512;
const desiredCount = config.getNumber("desiredCount") || 2;

// Security Group Configuration
const albPort = config.getNumber("albPort") || 80;
const allowedCidrBlocks = config.getObject<string[]>("allowedCidrBlocks") || ["0.0.0.0/0"];

// Create VPC
const vpc = new VpcComponent("vpc", {
    config: {
        ...defaultConfig.vpc,
        cidrBlock: vpcCidr,
        enableDnsSupport,
        enableDnsHostnames,
    },
    naming: {
        name: "vpc",
        environment,
        project,
    },
});

// Create Security Groups
const albSg = new SecurityGroupComponent("alb-sg", {
    config: {
        ...defaultConfig.security,
        vpcId: vpc.vpc.id,
        name: "alb-security-group",
        description: "Security group for ALB",
        ingress: [{
            protocol: "tcp",
            fromPort: albPort,
            toPort: albPort,
            cidrBlocks: allowedCidrBlocks,
            description: "Allow HTTP traffic"
        }],
        egress: [{
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: allowedCidrBlocks,
            description: "Allow all outbound traffic"
        }],
    },
    naming: {
        name: "alb-sg",
        environment,
        project,
    },
});

const ecsSg = new SecurityGroupComponent("ecs-sg", {
    config: {
        ...defaultConfig.security,
        vpcId: vpc.vpc.id,
        name: "ecs-security-group",
        description: "Security group for ECS tasks",
        ingress: [{
            protocol: "tcp",
            fromPort: containerPort,
            toPort: containerPort,
            securityGroups: [albSg.securityGroup.id],
            description: "Allow traffic from ALB"
        }],
        egress: [{
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Allow all outbound traffic"
        }],
    },
    naming: {
        name: "ecs-sg",
        environment,
        project,
    },
});

// Create ECR Repository
const ecr = new EcrComponent("ecr", {
    naming: {
        name: "ecr",
        environment,
        project,
    },
});

// Create ECS resources
const ecs = new EcsComponent("ecs", {
    config: {
        ...defaultConfig.ecs,
        image: pulumi.interpolate`${ecr.repositoryUrl}:latest`,
    },
    serviceConfig: {
        ...defaultConfig.service,
        vpcId: vpc.vpc.id,
        privateSubnetIds: vpc.privateSubnets.apply(subnets => pulumi.all(subnets.map(subnet => subnet.id))),
        securityGroupId: ecsSg.securityGroup.id,
        webMessage,
        containerPort,
        containerCpu,
        containerMemory,
        desiredCount,
    },
    naming: {
        name: "ecs",
        environment,
        project,
    },
});

// Create ALB
const alb = new AlbComponent("alb", {
    config: defaultConfig.alb,
    vpcId: vpc.vpc.id,
    publicSubnetIds: vpc.publicSubnets.apply(subnets => pulumi.all(subnets.map(subnet => subnet.id))),
    securityGroupId: albSg.securityGroup.id,
    targetGroupArn: ecs.targetGroup.arn,
    naming: {
        name: "alb",
        environment,
        project,
    },
});

// Export values
export const vpcId = vpc.vpc.id;
export const publicSubnetIds = vpc.publicSubnets.apply(subnets => subnets.map(subnet => subnet.id));
export const privateSubnetIds = vpc.privateSubnets.apply(subnets => subnets.map(subnet => subnet.id));
export const clusterArn = ecs.cluster.arn;
export const serviceName = ecs.service.name;
export const loadBalancerDnsName = alb.loadBalancer.dnsName;
export const repositoryUrl = ecr.repositoryUrl;
