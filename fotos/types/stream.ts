import { ITraceMeta } from "./common";

export interface IIndex {
  people: IIndexDictionary;
  tags: IIndexDictionary;
  error?: boolean;
}

// same shape as IIndex but calling it out as a
// different type to flag it wil have relative values that reflect the updates
export interface IIndexUpdate {
  people: IIndexDictionary;
  tags: IIndexDictionary;
}

export interface IIndexDictionary {
  [name: string]: number;
}

export interface IIndexFields {
  people: {
    new: number[];
    old: number[];
  };
  tags: {
    new: number[];
    old: number[];
  };
}

export interface IPutIndexRequest {
  indexUpdate: IIndexUpdate;
  traceMeta: ITraceMeta;
}
