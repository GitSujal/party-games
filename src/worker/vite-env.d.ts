// Vite features used by shared game content modules, typed for the Worker build.
declare module '*?raw' {
    const content: string;
    export default content;
}

interface ImportMeta {
    glob<T = unknown>(pattern: string, options: { eager: true; import: 'default' }): Record<string, T>;
}
