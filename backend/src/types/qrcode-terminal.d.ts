declare module 'qrcode-terminal' {
  interface QRCodeTerminalOptions {
    small?: boolean;
  }

  function generate(input: string, options?: QRCodeTerminalOptions, callback?: (qrcode: string) => void): void;

  const qrcodeTerminal: {
    generate: typeof generate;
  };

  export = qrcodeTerminal;
}
