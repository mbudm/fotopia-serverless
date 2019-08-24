export function createIndexAdjustment(arr) {
  const obj: any = {};
  arr.forEach((item) => {
    if (obj[item]) { // this might fail if the item key is falsy??
      obj[item]--;
    } else {
      obj[item] = -1;
    }
  });
  return obj;
}
