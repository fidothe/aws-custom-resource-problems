# Failure with Custom Resource processing

We're attempting to create an AWS Cloud HSM cluster through a CloudFormation stack, using the CDK.

Cloud HSM is not supported in CloudFormation, so we need to use a Custom Resource.

Because creation is a single API call, we can use CDK's [`AwsCustomResource`][1] class to do this. The Cloud HSM cluster is created as expected, but the attempt to get data from the create response is failing, causing Stack creation failure.

Additionally, even when an explicit CloudWatch log group is specified, nothing is logged from the call to `CreateCluster`. A separate log group is created implicitly which logs the lambda function that alters VPC default security group permissions, and that activity is logged.

It's not clear to me if this is a bug in the CDK Custom Resource code, documentation, or my code.

[1]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources.AwsCustomResource.html
