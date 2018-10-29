import { DynamoDBRecord } from "aws-lambda";
import { BoundingBox, FaceMatch, FaceMatchList, FaceRecord } from "aws-sdk/clients/rekognition";

export interface IPathParameters {
  username: string;
  id: string;
}

export interface IFace {
  ExternalImageId?: string;
  FaceId: string;
}

export interface IFaceWithPeople extends IFace {
  img_key: string;
  userIdentityId: string;
  People: IPersonMatch[];
  FaceMatches: FaceMatchList;
  BoundingBox: BoundingBox;
  ImageDimensions: IImageDimensions;
  ExternalImageId: string;
}

export interface IImageMeta {
  width: number;
  height: number;
}

export interface IImage {
  birthtime: number;
  createdAt: number;
  faces: FaceRecord[];
  group: string;
  meta: IImageMeta;
  id: string;
  img_key: string;
  tags: string[];
  people: string[];
  updatedAt: number;
  userIdentityId: string;
  username: string;
}

export interface IImageDimensions {
  height: number;
  width: number;
}

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

export interface IFaceMatcherCallbackResponse {
  FaceMatches: FaceMatch[];
  SearchedFaceId: string;
}

export type IFaceMatcherCallback = (faceId: string) => Promise<IFaceMatcherCallbackResponse>;

export interface IPersonMatch {
  Person: string;
  Match: number;
}

export interface IUpdateBody {
  faceMatches: IFaceWithPeople[];
  people: string[];
}

export interface ILoggerParams {
  newImages: IImage[];
  eventRecords: DynamoDBRecord[];
  updateBody?: IUpdateBody;
  existingPeople?: IPerson[];
  facesWithPeople?: IFaceWithPeople[];
  updatedPeople?: IPerson[];
  newPeopleInThisImage?: IPerson[];
}
