export interface NamingOptions {
    name: string;
    environment?: string;
    project?: string;
    suffix?: string;
}

export function createResourceName(options: NamingOptions): string {
    const parts = [
        options.project || "app",
        options.name,
        options.environment || "dev",
    ];

    if (options.suffix) {
        parts.push(options.suffix);
    }

    return parts.join("-");
}

export function createResourcePrefix(options: NamingOptions): string {
    return `${options.project || "app"}-${options.environment || "dev"}`;
} 