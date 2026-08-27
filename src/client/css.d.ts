/**
 * CSS import type declaration. With esbuild's `--loader:.css=text`, importing
 * a .css file returns the stylesheet as a plain string.
 */
declare module '*.css' {
  const content: string
  export default content
}
