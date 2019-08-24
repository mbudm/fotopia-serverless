export interface IIndex {
  people: IIndexDictionary;
  tags: IIndexDictionary;
  error?: boolean;
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
