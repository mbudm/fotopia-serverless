import { ITraceMeta } from "./common";
import { IFaceWithPeople } from "./faces";

export interface IUpdateBody {
  faceMatches?: IFaceWithPeople[];
  people?: string[];
  meta?: {
    [name: string]: string | number | undefined;
  };
  traceMeta?: ITraceMeta;
}
