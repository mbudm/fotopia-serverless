import { CloudFormation } from "aws-sdk"

export default function getConfig(stackname) {
  const cf = new CloudFormation({region: "us-east-1"});
  const params = {
    StackName: stackname,
  };
  return cf.describeStacks(params).promise()
  .then((response: CloudFormation.DescribeStacksOutput) => {
    const outputsList = response.Stacks && response.Stacks[0].Outputs || [];
    return outputsList.reduce((accum: any, output: CloudFormation.Output) => {
      return output.OutputKey ?
        {
          ...accum,
          [output.OutputKey]: output.OutputValue,
        } :
        accum;
      }, {});
  })
  .catch((err) => {
    // tslint:disable-next-line:no-console
    console.log(err);
  });
}
