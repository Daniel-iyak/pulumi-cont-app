import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as lb from "@pulumi/aws/lb";

export interface EcsServiceArgs {
    clusterArn: pulumi.Input<string>;
    taskExecutionRoleArn: pulumi.Input<string>;
    repositoryUrl: pulumi.Input<string>;
    privateSubnetIds: pulumi.Input<pulumi.Input<string>[]>;
    securityGroupId: pulumi.Input<string>;
    webMessage: pulumi.Input<string>;
    vpcId: pulumi.Input<string>;
}

export class EcsService extends pulumi.ComponentResource {
    public readonly service: aws.ecs.Service;
    public readonly taskDefinition: aws.ecs.TaskDefinition;
    public readonly targetGroup: lb.TargetGroup;

    constructor(name: string, args: EcsServiceArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:EcsService", name, {}, opts);

        // Create CloudWatch Log Group
        const logGroup = new aws.cloudwatch.LogGroup("appLogGroup", {
            name: "myfamily",
            retentionInDays: 30,
            tags: {
                Name: "app-log-group",
            },
        }, { parent: this });

        // Create Task Definition
        this.taskDefinition = new aws.ecs.TaskDefinition("myTaskDefinition", {
            family: "my-family",
            cpu: "256",
            memory: "512",
            networkMode: "awsvpc",
            requiresCompatibilities: ["FARGATE"],
            executionRoleArn: args.taskExecutionRoleArn,
            containerDefinitions: pulumi.all([args.repositoryUrl, logGroup.name]).apply(([repoUrl, logGroupName]) => JSON.stringify([{
                name: "my-container",
                image: `${repoUrl}:latest`,
                portMappings: [{
                    containerPort: 8080,
                    hostPort: 8080,
                    protocol: "tcp"
                }],
                environment: [{
                    name: "PORT",
                    value: "8080"
                }, {
                    name: "HOST",
                    value: "0.0.0.0"
                }, {
                    name: "MESSAGE",
                    value: args.webMessage
                }],
                logConfiguration: {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroupName,
                        "awslogs-region": "us-east-1",
                        "awslogs-stream-prefix": "ecs",
                        "awslogs-create-group": "true",
                        "mode": "non-blocking",
                        "max-buffer-size": "25m"
                    }
                }
            }]))
        }, { parent: this });

        // Create Target Group
        this.targetGroup = new lb.TargetGroup("appTargetGroup", {
            name: "app-target-group",
            port: 8080,
            protocol: "HTTP",
            targetType: "ip",
            vpcId: args.vpcId,
            healthCheck: {
                path: "/",
                port: "8080",
                protocol: "HTTP",
                healthyThreshold: 2,
                unhealthyThreshold: 5,
                timeout: 10,
                interval: 30,
                matcher: "200",
            },
            tags: {
                Name: "app-target-group",
            },
        }, { parent: this });

        // Create ECS Service
        this.service = new aws.ecs.Service("appService", {
            name: "app-service",
            cluster: args.clusterArn,
            taskDefinition: this.taskDefinition.arn,
            desiredCount: 2,
            launchType: "FARGATE",
            networkConfiguration: {
                subnets: args.privateSubnetIds,
                securityGroups: [args.securityGroupId],
                assignPublicIp: false,
            },
            loadBalancers: [{
                targetGroupArn: this.targetGroup.arn,
                containerName: "my-container",
                containerPort: 8080,
            }],
            deploymentMaximumPercent: 200,
            deploymentMinimumHealthyPercent: 50,
            healthCheckGracePeriodSeconds: 300,
            tags: {
                Name: "app-service",
            },
        }, { parent: this, dependsOn: [this.targetGroup] });

        this.registerOutputs({
            serviceName: this.service.name,
            taskDefinitionArn: this.taskDefinition.arn,
            targetGroupArn: this.targetGroup.arn,
        });
    }
} 