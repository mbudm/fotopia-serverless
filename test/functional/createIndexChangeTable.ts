import { IImage, IIndex } from "../../fotos/types";

export const MODES = {
  ADD: "ADD",
  REMOVE:  "REMOVE",
};
export function createIndexChangeTable(mode: string, images: IImage[], existingIndex: IIndex, actualIndex: IIndex) {
  const people = Object.keys(actualIndex.people).map((p: string) => {
    const imagesWithPerson = images.filter((img) => img.people && img.people.includes(p));
    const existing: number = isNaN(existingIndex.people[p]) ? 0 : existingIndex.people[p];
    return {
      actual: actualIndex.people[p],
      existing,
      expected: mode === MODES.ADD ? existing + imagesWithPerson.length : existing - imagesWithPerson.length,
      id: p,
      images: imagesWithPerson.map((img) => img.img_key),
    };
  });
  const tags = Object.keys(actualIndex.tags).map((t: string) => {
    const imagesWithTag = images.filter((img) => img.tags && img.tags.includes(t));
    const existing: number = isNaN(existingIndex.tags[t]) ? 0 : existingIndex.tags[t];
    return {
      actual: actualIndex.tags[t],
      existing,
      expected: mode === MODES.ADD ? existing + imagesWithTag.length : existing - imagesWithTag.length ,
      id: t,
      images: imagesWithTag.map((img) => img.img_key),
    };
  });
  const valid = {
    people: people.filter((p) => p.actual !== p.expected),
    tags: tags.filter((t) => t.actual !== t.expected),
  };
  return {
    people,
    tags,
    valid,
  };
}
