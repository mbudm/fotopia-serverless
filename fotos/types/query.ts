import { ItemList } from "aws-sdk/clients/dynamodb";
import { ITraceMeta } from "./common";
import { IImageMeta } from "./images";

export interface IQueryBody {
  traceMeta?: ITraceMeta;
  criteria?: {
    tags?: string[],
    people?: string[],
  };
  lastRetrievedBirthtime?: number;
  limit?: number;
  from: number;
  to: number;
  username?: string;
  breakDateRestriction?: boolean;
  clientId?: string;
}

export interface IQueryDBResponseItem {
  birthtime: string;
  group: string;
  meta: IImageMeta;
  id: string;
  img_key: string;
  img_thumb_key: string;
  people?: string[];
  tags?: string[];
  userIdentityId: string;
  username: string;
}

export interface IQueryResponse {
  items: IQueryDBResponseItem[];
  message: string;
  remainingResults: number;
}
