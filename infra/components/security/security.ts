import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { SecurityGroupConfig } from "../../config/types";
import { createResourceName, NamingOptions } from "../../utils/naming";
import { createTags, TagOptions } from "../../utils/tags";

export interface SecurityGroupComponentArgs {
    config: SecurityGroupConfig;
    naming: NamingOptions;
    tags?: TagOptions;
}

export class SecurityGroupComponent extends pulumi.ComponentResource {
    public readonly securityGroup: aws.ec2.SecurityGroup;

    constructor(name: string, args: SecurityGroupComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:SecurityGroupComponent", name, {}, opts);

        // Create Security Group
        this.securityGroup = new aws.ec2.SecurityGroup(
            createResourceName({ ...args.naming, suffix: "sg" }), {
                name: args.config.name,
                description: args.config.description,
                vpcId: args.config.vpcId,
                ingress: args.config.ingress.map(rule => ({
                    protocol: rule.protocol,
                    fromPort: rule.fromPort,
                    toPort: rule.toPort,
                    cidrBlocks: rule.cidrBlocks,
                    securityGroups: rule.securityGroups,
                    description: rule.description,
                })),
                egress: args.config.egress.map(rule => ({
                    protocol: rule.protocol,
                    fromPort: rule.fromPort,
                    toPort: rule.toPort,
                    cidrBlocks: rule.cidrBlocks,
                    securityGroups: rule.securityGroups,
                    description: rule.description,
                })),
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        this.registerOutputs({
            securityGroupId: this.securityGroup.id,
            securityGroupName: this.securityGroup.name,
        });
    }
} 