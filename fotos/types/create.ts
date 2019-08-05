import { IImageMeta } from "./images";

export interface ICreateBody {
  userIdentityId: string;
  username: string;
  meta: IImageMeta;
  img_key: string;
  birthtime: number;
  tags?: string[];
}
