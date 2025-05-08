import * as pulumi from "@pulumi/pulumi";
import { NamingOptions } from "../utils/naming";
import { TagOptions } from "../utils/tags";

export interface VpcConfig {
    cidrBlock: string;
    enableDnsSupport?: boolean;
    enableDnsHostnames?: boolean;
    tags?: Record<string, string>;
}

export interface SubnetConfig {
    cidrBlock: string;
    availabilityZone: string;
    mapPublicIpOnLaunch?: boolean;
    tags?: Record<string, string>;
}

export interface EcsConfig {
    clusterName: string;
    containerInsights?: boolean;
    image: pulumi.Input<string>;
    tags?: Record<string, string>;
}

export interface AlbConfig {
    name: string;
    internal?: boolean;
    loadBalancerType?: string;
    tags?: Record<string, string>;
}

export interface SecurityGroupConfig {
    name: string;
    description: string;
    vpcId: pulumi.Input<string>;
    ingress: SecurityGroupRule[];
    egress: SecurityGroupRule[];
    tags?: Record<string, string>;
}

export interface SecurityGroupRule {
    protocol: string;
    fromPort: number;
    toPort: number;
    cidrBlocks?: string[];
    securityGroups?: pulumi.Input<string>[];
    description: string;
}

export interface EcsServiceConfig {
    name: string;
    clusterArn: string;
    taskExecutionRoleArn: string;
    repositoryUrl: string;
    privateSubnetIds: pulumi.Input<pulumi.Input<string>[]>;
    securityGroupId: pulumi.Input<string>;
    webMessage: string;
    vpcId: pulumi.Input<string>;
    containerPort: number;
    containerCpu: number;
    containerMemory: number;
    desiredCount: number;
    tags?: Record<string, string>;
}

export interface InfrastructureConfig {
    vpc: VpcConfig;
    ecs: EcsConfig;
    alb: AlbConfig;
    security: SecurityGroupConfig;
    service: EcsServiceConfig;
}

export interface AlbComponentArgs {
    config: AlbConfig;
    vpcId: pulumi.Input<string>;
    publicSubnetIds: pulumi.Input<string[]>;
    securityGroupId: pulumi.Input<string>;
    targetGroupArn: pulumi.Input<string>;
    naming: NamingOptions;
    tags?: TagOptions;
} 