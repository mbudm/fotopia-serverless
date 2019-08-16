export function createIndexAdjustment(arr) {
  const obj: any = {};
  arr.forEach((item) => {
    if (obj[item]) {
      obj[item]--;
    } else {
      obj[item] = -1;
    }
  });
  return obj;
}
