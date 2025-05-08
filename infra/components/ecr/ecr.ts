import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { createResourceName, NamingOptions } from "../../utils/naming";
import { createTags, TagOptions } from "../../utils/tags";

export interface EcrComponentArgs {
    naming: NamingOptions;
    tags?: TagOptions;
}

export class EcrComponent extends pulumi.ComponentResource {
    public readonly repository: aws.ecr.Repository;
    public readonly repositoryUrl: pulumi.Output<string>;

    constructor(name: string, args: EcrComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:EcrComponent", name, {}, opts);

        // Create ECR Repository
        this.repository = new aws.ecr.Repository(createResourceName({ ...args.naming, suffix: "repo" }), {
            name: createResourceName({ ...args.naming, suffix: "repo" }),
            forceDelete: true,
            tags: createTags({ ...args.tags, name: args.naming.name }),
        }, { parent: this });

        // Get repository URL
        this.repositoryUrl = this.repository.repositoryUrl;

        this.registerOutputs({
            repositoryUrl: this.repositoryUrl,
        });
    }
} 