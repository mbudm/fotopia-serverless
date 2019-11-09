import { IIndex } from "../../fotos/types";

export function getIncorrectIndexUpdates(indexAdjustments, sourceIndex: IIndex, updatedIndex: IIndex) {
  return {
    people: Object.keys(indexAdjustments.people)
      .filter((p) => {
        const expectedCount = sourceIndex.people[p] + indexAdjustments.people[p];
        const actualCount = updatedIndex.people[p] ? updatedIndex.people[p] : 0;
        return expectedCount !== actualCount;
      }),
    tags: Object.keys(indexAdjustments.tags)
      .filter((tag) => {
        const expectedCount = sourceIndex.tags[tag] + indexAdjustments.tags[tag];
        const actualCount = updatedIndex.tags[tag] ? updatedIndex.tags[tag] : 0;
        return expectedCount !== actualCount;
      })
  };
}
