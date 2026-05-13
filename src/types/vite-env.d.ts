/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string;
  export default css;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WEB_BASE_URL: string;
  readonly VITE_JANUS_WS_URL: string;
  readonly VITE_DEV_AUTH_EMAIL: string;
  readonly VITE_DEV_AUTH_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
