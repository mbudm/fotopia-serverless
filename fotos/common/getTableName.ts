const getTableName = (): string => {
  if (process.env.DYNAMODB_TABLE) {
    return process.env.DYNAMODB_TABLE;
  } else {
    throw new Error("No DYNAMODB_TABLE env variable set");
  }
};
export default getTableName;
