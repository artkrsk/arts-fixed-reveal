/// <reference path="../src/ts/global.d.ts" />

declare module '*.sass' {
  const content: Record<string, string>
  export default content
}
