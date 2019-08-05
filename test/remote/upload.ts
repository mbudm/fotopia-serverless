import { Storage } from "aws-amplify";

Storage.configure({ level: "protected" });

export default function upload(key: string, object: any, options: any) {
  return Storage.put(key, object, { level: "protected", ...options });
}
