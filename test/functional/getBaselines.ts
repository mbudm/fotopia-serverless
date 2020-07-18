import { ISetupData } from "../types";
import formatError from "./formatError";

export default function getBaselines(setupData: ISetupData): ISetupData {
  return setupData.api.get(setupData.apiUrl, "/indexes")
    .then((existingIndexes) => ({ ...setupData, existingIndexes}))
    .catch(formatError);
}
