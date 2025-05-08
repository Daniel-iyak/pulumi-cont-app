import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { VpcConfig, SubnetConfig } from "../../config/types";
import { createResourceName, NamingOptions } from "../../utils/naming";
import { createTags, TagOptions } from "../../utils/tags";

export interface VpcComponentArgs {
    config: VpcConfig;
    naming: NamingOptions;
    tags?: TagOptions;
}

export class VpcComponent extends pulumi.ComponentResource {
    public readonly vpc: aws.ec2.Vpc;
    public readonly internetGateway: aws.ec2.InternetGateway;
    public readonly publicSubnets: pulumi.Output<aws.ec2.Subnet[]>;
    public readonly privateSubnets: pulumi.Output<aws.ec2.Subnet[]>;
    public readonly natGateway: pulumi.Output<aws.ec2.NatGateway>;
    public readonly publicRouteTable: aws.ec2.RouteTable;
    public readonly privateRouteTable: pulumi.Output<aws.ec2.RouteTable>;

    constructor(name: string, args: VpcComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:VpcComponent", name, {}, opts);

        // Create VPC
        this.vpc = new aws.ec2.Vpc(createResourceName({ ...args.naming, suffix: "vpc" }), {
            cidrBlock: args.config.cidrBlock,
            enableDnsSupport: args.config.enableDnsSupport,
            enableDnsHostnames: args.config.enableDnsHostnames,
            tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "vpc" }) }),
        }, { parent: this });

        // Create Internet Gateway
        this.internetGateway = new aws.ec2.InternetGateway(
            createResourceName({ ...args.naming, suffix: "igw" }), {
                vpcId: this.vpc.id,
                tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "igw" }) }),
            }, { parent: this }
        );

        // Get available AZs
        const availableZones = aws.getAvailabilityZones({
            state: "available",
        });

        // Create public subnets
        this.publicSubnets = pulumi.output(availableZones).apply(azs =>
            azs.names.map((zone, index) => new aws.ec2.Subnet(
                createResourceName({ ...args.naming, suffix: `public-subnet-${index}` }), {
                    vpcId: this.vpc.id,
                    cidrBlock: `10.0.${index + 1}.0/24`,
                    availabilityZone: zone,
                    mapPublicIpOnLaunch: true,
                    tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: `public-subnet-${index}` }) }),
                }, { parent: this }
            ))
        );

        // Create private subnets
        this.privateSubnets = pulumi.output(availableZones).apply(azs =>
            azs.names.map((zone, index) => new aws.ec2.Subnet(
                createResourceName({ ...args.naming, suffix: `private-subnet-${index}` }), {
                    vpcId: this.vpc.id,
                    cidrBlock: `10.0.${index + 10}.0/24`,
                    availabilityZone: zone,
                    tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: `private-subnet-${index}` }) }),
                }, { parent: this }
            ))
        );

        // Create Elastic IP for NAT Gateway
        const eip = new aws.ec2.Eip(
            createResourceName({ ...args.naming, suffix: "nat-eip" }), {
                tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "nat-eip" }) }),
            }, { parent: this }
        );

        // Create NAT Gateway
        this.natGateway = pulumi.all([this.publicSubnets, eip.id]).apply(([subnets, eipId]) =>
            new aws.ec2.NatGateway(
                createResourceName({ ...args.naming, suffix: "nat" }), {
                    allocationId: eipId,
                    subnetId: subnets[0].id,
                    tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "nat" }) }),
                }, { parent: this }
            )
        );

        // Create public route table
        this.publicRouteTable = new aws.ec2.RouteTable(
            createResourceName({ ...args.naming, suffix: "public-rt" }), {
                vpcId: this.vpc.id,
                routes: [{
                    cidrBlock: "0.0.0.0/0",
                    gatewayId: this.internetGateway.id,
                }],
                tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "public-rt" }) }),
            }, { parent: this }
        );

        // Create private route table
        this.privateRouteTable = pulumi.all([this.natGateway.id]).apply(([natId]) =>
            new aws.ec2.RouteTable(
                createResourceName({ ...args.naming, suffix: "private-rt" }), {
                    vpcId: this.vpc.id,
                    routes: [{
                        cidrBlock: "0.0.0.0/0",
                        natGatewayId: natId,
                    }],
                    tags: createTags({ ...args.tags, name: createResourceName({ ...args.naming, suffix: "private-rt" }) }),
                }, { parent: this }
            )
        );

        // Associate public subnets with public route table
        pulumi.all([this.publicSubnets, this.publicRouteTable.id]).apply(([subnets, rtId]) =>
            subnets.map((subnet, index) => new aws.ec2.RouteTableAssociation(
                createResourceName({ ...args.naming, suffix: `public-rta-${index}` }), {
                    subnetId: subnet.id,
                    routeTableId: rtId,
                }, { parent: this }
            ))
        );

        // Associate private subnets with private route table
        pulumi.all([this.privateSubnets, this.privateRouteTable.id]).apply(([subnets, rtId]) =>
            subnets.map((subnet, index) => new aws.ec2.RouteTableAssociation(
                createResourceName({ ...args.naming, suffix: `private-rta-${index}` }), {
                    subnetId: subnet.id,
                    routeTableId: rtId,
                }, { parent: this }
            ))
        );

        this.registerOutputs({
            vpcId: this.vpc.id,
            publicSubnetIds: this.publicSubnets.apply(subnets => subnets.map((subnet: aws.ec2.Subnet) => subnet.id)),
            privateSubnetIds: this.privateSubnets.apply(subnets => subnets.map((subnet: aws.ec2.Subnet) => subnet.id)),
        });
    }
} 