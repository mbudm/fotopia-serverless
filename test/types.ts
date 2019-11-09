import { ICreateBody, IIndex } from "../fotos/types";

export interface ISetupData {
  apiUrl: string;
  collectionId: string;
  images: ITestImage[];
  records: ICreateBody[];
  region?: string;
  startTime: number;
  username: string;
  uniqueTag: string;
  api?: any;
  upload?: any;
  bucket?: string;
  userIdentityId?: string;
  existingIndexes?: IIndex;
  credentials?: any;
}

export interface ITestImage {
  path: string;
  key: string;
}
