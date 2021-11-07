declare module "*.css" {
    const mapping: Record<string, string>
    export default mapping
}

declare module "preact-cli/sw/" {
    export function setupRouting(): void
    export function setupPrecaching(): void
    export function getFiles(): void
}
