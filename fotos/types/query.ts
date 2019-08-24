import { ITraceMeta } from "./common";
import { IImageMeta } from "./images";

export interface IQueryBody {
  traceMeta?: ITraceMeta;
  criteria?: IQueryBodyCriteria;
  from: number;
  to: number;
  username?: string;
}

export interface IQueryBodyCriteria {
  tags: string[];
  people: string[];
}

export interface IQueryResponse {
  group?: string;
  birthtime: number;
  username: string;
  userIdentityId: string;
  id: string;
  meta: IImageMeta;
  tags?: string[];
  people?: string[];
  img_key: string;
  img_thumb_key: string;
}
