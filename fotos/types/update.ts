import { IFaceWithPeople } from "./faces";
import { IImageMeta } from "./images";

export interface IUpdateBody {
  faceMatches?: IFaceWithPeople[];
  people?: string[];
  meta?: {
    [name: string]: string | number | undefined;
  };
}
