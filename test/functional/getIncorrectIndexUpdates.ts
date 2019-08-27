import { IIndex } from "../../fotos/types";

export function getIncorrectIndexUpdates(indexAdjustments, sourceIndex: IIndex, updatedIndex: IIndex) {
  return {
    people: Object.keys(indexAdjustments.people)
      .filter((p) => updatedIndex.people[p] !== 0 ||
        updatedIndex.people[p] !== sourceIndex.people[p] + indexAdjustments.people[p]),
    tags: Object.keys(indexAdjustments.tags)
      .filter((tag) => updatedIndex.tags[tag] !== 0 ||
        updatedIndex.tags[tag] !== sourceIndex.tags[tag] + indexAdjustments.tags[tag]),
  };
}
