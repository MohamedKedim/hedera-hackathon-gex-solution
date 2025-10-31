interface Recaptcha {
  ready: (callback: () => void) => void;
  render: (container: string | HTMLElement, parameters: {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
  }) => number;
  reset: (widgetId?: number) => void;
  execute: (sitekey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha: Recaptcha;
  }
}