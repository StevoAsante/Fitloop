// The web bundler handles importing .css files directly, TypeScript has
// no idea what to do with them without this. Declared with no shape
// since nothing in the app reads a value back from a CSS import, it's
// imported purely for its side effect (see src/global.css).
declare module '*.css';
