export interface IIndex {
  people: IIndexDictionary;
  tags: IIndexDictionary;
}

export interface IIndexDictionary {
  [name: string]: number;
}
