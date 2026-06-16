declare module "multer" {
  export function diskStorage(options: {
    destination: string;
    filename: (req: unknown, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => void;
  }): unknown;
}

declare namespace Express {
  namespace Multer {
    type File = {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      destination: string;
      filename: string;
      path: string;
      size: number;
    };
  }
}
