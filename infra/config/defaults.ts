import * as pulumi from "@pulumi/pulumi";
import { InfrastructureConfig } from './types';

export const defaultConfig: InfrastructureConfig = {
    vpc: {
        cidrBlock: "", // Will be set from config
        enableDnsSupport: true, // Will be set from config
        enableDnsHostnames: true, // Will be set from config
        tags: {
            Name: "app-vpc",
        },
    },
    ecs: {
        clusterName: "app-cluster",
        containerInsights: true,
        image: "", // Will be set dynamically
        tags: {
            Name: "app-cluster",
        },
    },
    alb: {
        name: "app-alb",
        internal: false,
        loadBalancerType: "application",
        tags: {
            Name: "app-alb",
        },
    },
    security: {
        name: "app-security-group",
        description: "Security group for application",
        vpcId: pulumi.output(""), // Will be set dynamically
        ingress: [], // Will be set from config
        egress: [], // Will be set from config
        tags: {
            Name: "app-security-group",
        },
    },
    service: {
        name: "app-service",
        clusterArn: "", // Will be set dynamically
        taskExecutionRoleArn: "", // Will be set dynamically
        repositoryUrl: "", // Will be set dynamically
        privateSubnetIds: pulumi.output([]), // Will be set dynamically
        securityGroupId: pulumi.output(""), // Will be set dynamically
        webMessage: "", // Will be set from config
        vpcId: pulumi.output(""), // Will be set dynamically
        containerPort: 0, // Will be set from config
        containerCpu: 0, // Will be set from config
        containerMemory: 0, // Will be set from config
        desiredCount: 0, // Will be set from config
        tags: {
            Name: "app-service",
        },
    },
}; 