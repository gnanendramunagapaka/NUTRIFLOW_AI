// Provide a minimal ambient declaration for `fetch` in the Node runtime so
// TypeScript typechecks don't fail in environments that don't include the
// DOM lib. This is intentionally permissive — runtime uses Node's global
// fetch (Node 18+) or a polyfill in production.
declare function fetch(input: any, init?: any): Promise<any>;

export {};
