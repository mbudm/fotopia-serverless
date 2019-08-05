import { ITraceMeta } from "./common";

export interface IQueryBody {
  traceMeta?: ITraceMeta;
  criteria?: {
    tags: string[],
    people: string[],
  };
  from: number;
  to: number;
  username?: string;
}
