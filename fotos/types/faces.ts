import {
  BoundingBox,
  FaceMatch,
  FaceMatchList,
  FaceRecord,
  Landmark,
} from "aws-sdk/clients/rekognition";

import { IImageDimensions } from "./images";
import {
  IPersonMatch,
} from "./people";

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
  Landmarks?: Landmark[];
  ImageDimensions: IImageDimensions;
  ExternalImageId: string;
}

export interface IFaceMatcherCallbackResponse {
  FaceMatches: FaceMatch[];
  SearchedFaceId: string;
}

export type IFaceMatcherCallback = (faceId: string) => Promise<IFaceMatcherCallbackResponse>;

export interface IFaceDimensions extends IImageDimensions {
  left: number;
  top: number;
}
