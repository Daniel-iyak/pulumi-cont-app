import * as pulumi from "@pulumi/pulumi";

export interface TagOptions {
    name: string;
    environment?: string;
    project?: string;
    additionalTags?: Record<string, string>;
}

export function createTags(options: TagOptions): Record<string, string> {
    const baseTags = {
        Name: options.name,
        Environment: options.environment || "dev",
        Project: options.project || "pulumi-app",
        ManagedBy: "pulumi",
    };

    return {
        ...baseTags,
        ...(options.additionalTags || {}),
    };
}

export function applyTags<T extends { tags?: Record<string, string> }>(
    resource: T,
    options: TagOptions
): T {
    return {
        ...resource,
        tags: createTags(options),
    };
} 