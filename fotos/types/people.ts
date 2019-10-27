import { BoundingBox, Landmark } from "aws-sdk/clients/rekognition";
import { ITraceMeta } from "./common";
import { IFace } from "./faces";
import { IImageDimensions } from "./images";

export interface IPerson {
  id: string;
  faces: IFace[];
  boundingBox?: BoundingBox;
  imageDimensions: IImageDimensions;
  img_key: string;
  landMarks?: Landmark[];
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

export interface IPersonPathParameters {
  id: string;
}

export type IPersonMergeBody = string[];

export interface IPersonWithImages {
  id: string;
  imageIds: string[];
}

export interface IPutPeopleRequest {
  people: IPerson[];
  traceMeta: ITraceMeta;
}

export interface IBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}
