import { ICreateBody } from "../fotos/types";

export interface ISetupData {
  apiUrl: string;
  collectionId: string;
  images: ITestImage[];
  records: ICreateBody[];
  region?: string;
  startTime: number;
  username: string;
  uniqueTag: string;
}

export interface ITestImage {
  path: string;
  key: string;
}
