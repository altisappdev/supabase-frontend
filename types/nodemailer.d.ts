declare module "nodemailer" {
  interface Transporter {
    sendMail(options: Record<string, unknown>): Promise<unknown>;
  }

  function createTransport(options: Record<string, unknown>): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export type { Transporter };
  export { createTransport };
  export default nodemailer;
}