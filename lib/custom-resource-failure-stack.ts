import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';

export class CustomResourceFailureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hsmSubnetConfiguration: ec2.SubnetConfiguration = {
      name: 'hsm',
      subnetType: ec2.SubnetType.PUBLIC,
    };
    const vpc = new ec2.Vpc(this, 'SaxonicaCiCdVpc', {
      maxAzs: 1,
      subnetConfiguration: [ hsmSubnetConfiguration ],
    });
    const logGroup = new logs.LogGroup(this, 'HsmCreationLogGroup');
    const hsmSubnet = vpc.publicSubnets[0];
  
    const hsmCreationRole = new iam.Role(this, 'HsmCreationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        HsmCreationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'ec2:AuthorizeSecurityGroupIngress',
                'ec2:AuthorizeSecurityGroupEgress',
                'ec2:RevokeSecurityGroupIngress',
                'ec2:RevokeSecurityGroupEgress',
                'ec2:CreateSecurityGroup',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeSubnets',
                'iam:CreateServiceLinkedRole',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // # create Cloud HSM cluster through custom resource
    const hsmCluster = new cr.AwsCustomResource(this, 'HsmCluster', {
      onCreate: {
        service: 'CloudHSMv2',
        action: 'CreateCluster',
        parameters: {
          BackupRetentionPolicy: { 
            Type: 'DAYS',
            Value: '379',
         },
         HsmType: 'hsm1.medium',
         Mode: 'FIPS',
         SubnetIds: [ hsmSubnet.subnetId ],      
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('Cluster.ClusterId')
      },
      logGroup: logGroup,
      role: hsmCreationRole,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),    
    });

    const hsmSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'HsmSecurityGroup', hsmCluster.getResponseField('Cluster.SecurityGroup'));
    
    new cdk.CfnOutput(this, 'HsmSGId', {
      value: hsmSecurityGroup.securityGroupId,
      description: 'HSM Security Group ID'
    });
  }
}
