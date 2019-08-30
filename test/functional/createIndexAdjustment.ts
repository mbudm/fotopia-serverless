export function createIndexSubtract(arr) {
  const obj: any = {};
  arr.forEach((item) => {
    if (obj[item]) { // this might fail if the item key is falsy?? .i.e value of 0
      obj[item]--;
    } else {
      obj[item] = -1;
    }
  });
  return obj;
}

export function createIndexAdd(arr) {
  const obj: any = {};
  arr.forEach((item) => {
    if (obj[item]) {
      obj[item]++;
    } else {
      obj[item] = 1;
    }
  });
  return obj;
}
