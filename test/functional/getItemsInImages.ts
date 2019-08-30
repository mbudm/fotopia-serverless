import { IImage } from "../../fotos/types";

export function getItemsInImages(key: string, imgArr: IImage[]): string[] {
  return imgArr.reduce((accum, img) => accum.concat(img[key]), [] as string[]);
}
