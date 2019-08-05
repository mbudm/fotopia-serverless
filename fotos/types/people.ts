import { BoundingBox } from "aws-sdk/clients/rekognition";
import { IFace } from "./faces";
import { IImageDimensions } from "./images";

export interface IPerson {
  id: string;
  faces: IFace[];
  boundingBox?: BoundingBox;
  imageDimensions: IImageDimensions;
  img_key: string;
  name: string;
  thumbnail: string;
  userIdentityId: string;
}

export interface IPersonMatch {
  Person: string;
  Match: number;
}

export interface IPersonUpdateBody {
  name: string;
}

export type IPersonMergeBody = string[];
