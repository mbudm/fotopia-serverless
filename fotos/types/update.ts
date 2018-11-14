import { IFaceWithPeople } from "./faces";

export interface IUpdateBody {
  faceMatches: IFaceWithPeople[];
  people: string[];
}
