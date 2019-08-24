import { FaceMatch, FaceRecord } from "aws-sdk/clients/rekognition";

export interface IImage {
  birthtime: number;
  createdAt?: number;
  faces?: FaceRecord[];
  faceMatches?: FaceMatch[];
  group: string;
  meta: IImageMeta;
  id: string;
  img_key: string;
  tags?: string[];
  people?: string[];
  updatedAt?: number;
  userIdentityId: string;
  username: string;
}

export interface IImageDimensions {
  height: number;
  width: number;
}

export interface IImageMeta {
  width: number;
  height: number;
  lastModified?: number;
  name?: string;
  size?: number;
  type?: string;
  [name: string]: string | number | undefined;
}
