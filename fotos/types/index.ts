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

export interface ILoggerBaseParams {
  Timestamp: number;	// How much time the span took, in milliseconds
  id: string; // A unique ID for each span
  name: string; // The specific call location (like a function or method name)
  parentId: string;	// The ID of this span’s parent span, the call location the current span was called from
  traceId: string; // The ID of the trace this span belongs to
}

export interface ILoggerFacesParams {
  newImage: IImage;
  updateBody?: IUpdateBody;
  existingPeople?: IPerson[];
  facesWithPeople?: IFaceWithPeople[];
  updatedPeople?: IPerson[];
  newPeopleInThisImage?: IPerson[];
}

export interface ILoggerImageParams {
  imageBirthtime: number;
  imageCreatedAt: number;
  imageFacesCount: number;
  imageFamilyGroup: string;
  imageHeight: number;
  imageId: string;
  imageKey: string;
  imageTagCount: number;
  imageUpdatedAt: number;
  imageUserIdentityId: string;
  imageUsername: string;
  imageWidth: number;
}

export interface ILoggerCreateParams extends ILoggerImageParams {
  createIdentifiedFacesCount: number;
  createIdentifiedLabelsCount: number;
  createPayloadTagCount: number;
}

export interface ITraceMeta {
  parentId: string;
  traceId: string;
}

export interface IQueryBody {
  traceMeta?: ITraceMeta;
  criteria?: {
    tags: string[],
    people: string[],
  };
  from: number;
  to: number;
  username: string;
}

export interface IImageMeta {
  width: number;
  height: number;
  lastModified?: number;
  name?: string;
  size?: number;
  type?: string;
}

export interface ICreateBody {
  userIdentityId: string;
  username: string;
  meta: IImageMeta;
  img_key: string;
  birthtime: number;
}
