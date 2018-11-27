import { FaceRecord } from "aws-sdk/clients/rekognition";

export interface IImageMeta {
  width: number;
  height: number;
}

export interface IImage {
  birthtime: string;
  createdAt?: number;
  faces?: FaceRecord[];
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
}
