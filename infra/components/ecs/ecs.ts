import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { EcsConfig, EcsServiceConfig } from "../../config/types";
import { createResourceName, NamingOptions } from "../../utils/naming";
import { createTags, TagOptions } from "../../utils/tags";

export interface EcsComponentArgs {
    config: EcsConfig;
    serviceConfig: EcsServiceConfig;
    naming: NamingOptions;
    tags?: TagOptions;
}

export class EcsComponent extends pulumi.ComponentResource {
    public readonly cluster: aws.ecs.Cluster;
    public readonly service: aws.ecs.Service;
    public readonly targetGroup: aws.lb.TargetGroup;
    public readonly logGroup: aws.cloudwatch.LogGroup;

    constructor(name: string, args: EcsComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:EcsComponent", name, {}, opts);

        // Create ECS Cluster
        this.cluster = new aws.ecs.Cluster(
            createResourceName({ ...args.naming, suffix: "cluster" }), {
                name: args.config.clusterName,
                settings: [{
                    name: "containerInsights",
                    value: args.config.containerInsights ? "enabled" : "disabled",
                }],
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Create CloudWatch Log Group
        this.logGroup = new aws.cloudwatch.LogGroup(
            createResourceName({ ...args.naming, suffix: "logs" }), {
                name: `ecs-${args.naming.name}`,
                retentionInDays: 30,
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Create Task Execution Role
        const taskExecutionRole = new aws.iam.Role(
            createResourceName({ ...args.naming, suffix: "task-exec-role" }), {
                assumeRolePolicy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [{
                        Action: "sts:AssumeRole",
                        Principal: {
                            Service: "ecs-tasks.amazonaws.com",
                        },
                        Effect: "Allow",
                    }],
                }),
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Attach ECS Task Execution Role Policy
        new aws.iam.RolePolicyAttachment(
            createResourceName({ ...args.naming, suffix: "task-exec-policy" }), {
                role: taskExecutionRole.name,
                policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
            }, { parent: this }
        );

        // Create Target Group
        this.targetGroup = new aws.lb.TargetGroup(
            createResourceName({ ...args.naming, suffix: "tg" }), {
                port: args.serviceConfig.containerPort,
                protocol: "HTTP",
                vpcId: args.serviceConfig.vpcId,
                targetType: "ip",
                healthCheck: {
                    path: "/health",
                    port: "traffic-port",
                    healthyThreshold: 2,
                    unhealthyThreshold: 3,
                    timeout: 5,
                    interval: 30,
                    matcher: "200-299",
                },
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Create ECS Service
        this.service = new aws.ecs.Service(
            createResourceName({ ...args.naming, suffix: "service" }), {
                cluster: this.cluster.arn,
                desiredCount: args.serviceConfig.desiredCount || 2,
                launchType: "FARGATE",
                taskDefinition: pulumi.all([
                    taskExecutionRole.arn,
                    args.config.image,
                    args.serviceConfig.webMessage,
                    args.serviceConfig.containerPort || 8080,
                    args.serviceConfig.containerCpu || 256,
                    args.serviceConfig.containerMemory || 512,
                ]).apply(([roleArn, image, message, port, cpu, memory]) => 
                    new aws.ecs.TaskDefinition(
                        createResourceName({ ...args.naming, suffix: "task" }), {
                            family: args.naming.name,
                            cpu: cpu.toString(),
                            memory: memory.toString(),
                            networkMode: "awsvpc",
                            requiresCompatibilities: ["FARGATE"],
                            executionRoleArn: roleArn,
                            containerDefinitions: JSON.stringify([{
                                name: args.naming.name,
                                image: image,
                                portMappings: [{
                                    containerPort: port,
                                    protocol: "tcp",
                                }],
                                environment: [{
                                    name: "MESSAGE",
                                    value: message,
                                }, {
                                    name: "PORT",
                                    value: port.toString(),
                                }],
                                healthCheck: {
                                    command: ["CMD-SHELL", pulumi.interpolate`curl -f http://localhost:${args.serviceConfig.containerPort}/health || exit 1`],
                                    interval: 30,
                                    timeout: 5,
                                    retries: 3,
                                    startPeriod: 60
                                },
                                logConfiguration: {
                                    logDriver: "awslogs",
                                    options: {
                                        "awslogs-group": `ecs-${args.naming.name}`,
                                        "awslogs-region": aws.config.region,
                                        "awslogs-stream-prefix": "ecs",
                                    },
                                },
                            }]),
                            tags: createTags({ ...args.tags, name: args.naming.name }),
                        }, { parent: this }
                    ).arn
                ),
                networkConfiguration: {
                    subnets: args.serviceConfig.privateSubnetIds,
                    securityGroups: [args.serviceConfig.securityGroupId],
                    assignPublicIp: false,
                },
                loadBalancers: [{
                    targetGroupArn: this.targetGroup.arn,
                    containerName: args.naming.name,
                    containerPort: args.serviceConfig.containerPort,
                }],
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        this.registerOutputs({
            clusterArn: this.cluster.arn,
            serviceName: this.service.name,
            targetGroupArn: this.targetGroup.arn,
        });
    }
} 