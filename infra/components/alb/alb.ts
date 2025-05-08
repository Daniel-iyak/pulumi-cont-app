import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { AlbConfig } from "../../config/types";
import { createResourceName, NamingOptions } from "../../utils/naming";
import { createTags, TagOptions } from "../../utils/tags";

export interface AlbComponentArgs {
    config: AlbConfig;
    vpcId: pulumi.Input<string>;
    publicSubnetIds: pulumi.Input<string[]>;
    securityGroupId: pulumi.Input<string>;
    targetGroupArn: pulumi.Input<string>;
    naming: NamingOptions;
    tags?: TagOptions;
}

export class AlbComponent extends pulumi.ComponentResource {
    public readonly loadBalancer: aws.lb.LoadBalancer;
    public readonly listener: aws.lb.Listener;
    public readonly listenerRule: aws.lb.ListenerRule;

    constructor(name: string, args: AlbComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:AlbComponent", name, {}, opts);

        // Create Application Load Balancer
        this.loadBalancer = new aws.lb.LoadBalancer(
            createResourceName({ ...args.naming, suffix: "alb" }), {
                internal: args.config.internal,
                loadBalancerType: args.config.loadBalancerType,
                securityGroups: [args.securityGroupId],
                subnets: args.publicSubnetIds,
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Create HTTP Listener
        this.listener = new aws.lb.Listener(
            createResourceName({ ...args.naming, suffix: "listener" }), {
                loadBalancerArn: this.loadBalancer.arn,
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
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        // Create Listener Rule
        this.listenerRule = new aws.lb.ListenerRule(
            createResourceName({ ...args.naming, suffix: "listener-rule" }), {
                listenerArn: this.listener.arn,
                priority: 1,
                conditions: [{
                    pathPattern: {
                        values: ["/*"],
                    },
                }],
                actions: [{
                    type: "forward",
                    targetGroupArn: args.targetGroupArn,
                }],
                tags: createTags({ ...args.tags, name: args.naming.name }),
            }, { parent: this }
        );

        this.registerOutputs({
            loadBalancerArn: this.loadBalancer.arn,
            loadBalancerDnsName: this.loadBalancer.dnsName,
            listenerArn: this.listener.arn,
        });
    }
} 