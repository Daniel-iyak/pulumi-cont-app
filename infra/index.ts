import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as lb from "@pulumi/aws/lb";
import { EcsService } from "./ecs-service";

// Get configuration values
const config = new pulumi.Config();
const webMessage = config.require("webMessage");

// Get available zones
const availableZones = aws.getAvailabilityZones({
    state: "available",
});

// Create VPC
const vpc = new aws.ec2.Vpc("appVpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: "app-vpc",
    },
});

// Create Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("appIgw", {
    vpcId: vpc.id,
    tags: {
        Name: "app-igw",
    },
});

// Create public subnets in all available zones
const publicSubnets = pulumi.output(availableZones).apply(az => 
    az.names.map((zone, index) => new aws.ec2.Subnet(`publicSubnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index + 1}.0/24`,
        availabilityZone: zone,
        mapPublicIpOnLaunch: true,
        tags: {
            Name: `app-public-subnet-${index}`,
        },
    }))
);

// Create route table for public subnets
const publicRouteTable = new aws.ec2.RouteTable("publicRouteTable", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    }],
    tags: {
        Name: "app-public-rt",
    },
});

// Associate public subnets with route table
const publicSubnetRouteTableAssociations = pulumi.all([publicSubnets, publicRouteTable.id]).apply(([subnets, rtId]) =>
    subnets.map((subnet, index) => new aws.ec2.RouteTableAssociation(`publicRta-${index}`, {
        subnetId: subnet.id,
        routeTableId: rtId,
    }))
);

// Create Elastic IP for NAT Gateway
const eip = new aws.ec2.Eip("natEip", {
    tags: {
        Name: "app-nat-eip",
    },
});

// Create NAT Gateway in the first public subnet
const natGateway = pulumi.all([publicSubnets, eip.id]).apply(([subnets, eipId]) =>
    new aws.ec2.NatGateway("appNatGateway", {
        allocationId: eipId,
        subnetId: subnets[0].id,
        tags: {
            Name: "app-nat-gateway",
        },
    })
);

// Create private subnets in all available zones
const privateSubnets = pulumi.output(availableZones).apply(az =>
    az.names.map((zone, index) => new aws.ec2.Subnet(`privateSubnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index + 10}.0/24`,
        availabilityZone: zone,
        tags: {
            Name: `app-private-subnet-${index}`,
        },
    }))
);

// Create route table for private subnets
const privateRouteTable = pulumi.all([natGateway.id]).apply(([natId]) =>
    new aws.ec2.RouteTable("privateRouteTable", {
        vpcId: vpc.id,
        routes: [{
            cidrBlock: "0.0.0.0/0",
            natGatewayId: natId,
        }],
        tags: {
            Name: "app-private-rt",
        },
    })
);

// Associate private subnets with route table
const privateSubnetRouteTableAssociations = pulumi.all([privateSubnets, privateRouteTable.id]).apply(([subnets, rtId]) =>
    subnets.map((subnet, index) => new aws.ec2.RouteTableAssociation(`privateRta-${index}`, {
        subnetId: subnet.id,
        routeTableId: rtId,
    }))
);

// Create ECR Repository
const repository = new aws.ecr.Repository("appRepository", {
    name: "app-repo",
    forceDelete: true,
    tags: {
        Name: "app-repository",
    },
});

// Create ECS Cluster
const cluster = new aws.ecs.Cluster("appCluster", {
    name: "app-cluster",
    settings: [{
        name: "containerInsights",
        value: "enabled",
    }],
    tags: {
        Name: "app-cluster",
    },
});

// Create ECS Task Execution Role
const taskExecutionRole = new aws.iam.Role("taskExecutionRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com",
            },
        }],
    }),
    tags: {
        Name: "app-task-execution-role",
    },
});

// Attach ECS Task Execution Role Policy
const taskExecutionRolePolicy = new aws.iam.RolePolicyAttachment("taskExecutionRolePolicy", {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// Create security group for the load balancer
const albSg = new aws.ec2.SecurityGroup("albSg", {
    vpcId: vpc.id,
    ingress: [{
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
        description: "Allow HTTP traffic"
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "Allow all outbound traffic"
    }],
    tags: {
        Name: "alb-security-group",
    },
});

// Create security group for the ECS tasks
const ecsSg = new aws.ec2.SecurityGroup("ecsSg", {
    vpcId: vpc.id,
    ingress: [{
        protocol: "tcp",
        fromPort: 8080,
        toPort: 8080,
        securityGroups: [albSg.id],
        description: "Allow traffic from ALB"
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "Allow all outbound traffic"
    }],
    tags: {
        Name: "ecs-security-group",
    },
});

// Create Application Load Balancer
const alb = new lb.LoadBalancer("appAlb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [albSg.id],
    subnets: pulumi.output(publicSubnets).apply(subnets => subnets.map(subnet => subnet.id)),
    tags: {
        Name: "app-alb",
    },
});

// Create HTTP Listener
const listener = new lb.Listener("appListener", {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "fixed-response",
        fixedResponse: {
            contentType: "text/plain",
            messageBody: "Not Found",
            statusCode: "404",
        },
    }],
});

// Create ECS Service using our component
const ecsService = new EcsService("appEcsService", {
    clusterArn: cluster.arn,
    taskExecutionRoleArn: taskExecutionRole.arn,
    repositoryUrl: repository.repositoryUrl,
    privateSubnetIds: privateSubnets.apply(subnets => subnets.map(subnet => subnet.id)),
    securityGroupId: ecsSg.id,
    webMessage: webMessage,
    vpcId: vpc.id,
});

// Add listener rule to route traffic to our target group
const listenerRule = new lb.ListenerRule("appListenerRule", {
    listenerArn: listener.arn,
    priority: 1,
    conditions: [{
        pathPattern: {
            values: ["/*"],
        },
    }],
    actions: [{
        type: "forward",
        targetGroupArn: ecsService.targetGroup.arn,
    }],
});

// Export values
export const vpcId = vpc.id;
export const publicSubnetIds = pulumi.output(publicSubnets).apply(subnets => subnets.map(subnet => subnet.id));
export const privateSubnetIds = pulumi.output(privateSubnets).apply(subnets => subnets.map(subnet => subnet.id));
export const clusterName = cluster.name;
export const repositoryUrl = repository.repositoryUrl;
export const albDnsName = alb.dnsName;
