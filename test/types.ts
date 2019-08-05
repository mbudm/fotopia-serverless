import { ICreateBody } from "../fotos/types";

export interface ISetupData {
  apiUrl: string;
  images: ITestImage[];
  records: ICreateBody[];
  username: string;
  uniqueTag: string;
}

export interface ITestImage {
  path: string;
  key: string;
}
