# 04. RDS SETUP

## LAB PURPOSE

Create relational database wich will be used for storing data 

## DEFINITIONS
----

### Aurora serverless

Amazon Aurora Serverless is an on-demand, auto-scaling configuration for Amazon Aurora (MySQL-compatible and PostgreSQL-compatible editions), where the database will automatically start up, shut down, and scale capacity up or down based on your application's needs. 

## STEPS
---

1. CREATE CLOUDFORMATION TEMPLATE

* Rename boilerplate.yaml to worshop-rds.yaml, this is the place where you should put all of your resources

2. CREATE AURORA SERVERLESS DB

* To create aurora serverless you will need to have two cloudformation resources **AWS::RDS::DBSubnetGroup** and **AWS::RDS::DBCluster**, you can find them (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbsubnet-group.html, https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbcluster.html)
* Try to investigate what fields are mandatory
* Aurora serverless should be placed in private subnets which you created before
* Remember to set up a security group for aurora, to have access to db instance later on
* If you will have problems you can use code listed below:

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >
  This template creates an Aurora serverless

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Rds configuration
        Parameters:
          - RDSUsername
          - RDSPassword
          - RDSDatabaseName
          - RDSSecurityGroup
          - RDSBackupRetentionPeriod
          - PrivateSubnetIds

Parameters:
  RDSUsername:
    Type: String
    NoEcho: true
  RDSPassword:
    Type: String
    MinLength: 8
    NoEcho: true
  RDSDatabaseName:
    Type: String
  RDSBackupRetentionPeriod:
    Type: Number
  RDSSecurityGroup:
    Type: AWS::EC2::SecurityGroup::Id
  PrivateSubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
  
Resources:
 
  RDSCluster:
    Type: AWS::RDS::DBCluster
    Properties:
      Engine: aurora
      EngineMode: serverless
      EngineVersion: '5.6'
      DatabaseName: !Ref RDSDatabaseName
      MasterUsername: !Ref RDSUsername
      MasterUserPassword: !Ref RDSPassword
      BackupRetentionPeriod: !Ref RDSBackupRetentionPeriod
      DBSubnetGroupName: !Ref RDSSubnetGroup
      VpcSecurityGroupIds:
        - !Ref RDSSecurityGroup

  RDSSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet for the RDS Cluster
      SubnetIds: !Ref PrivateSubnetIds


Outputs:
  DbClusterAddress:
    Description: Cluster address
    Value: !GetAtt RDSCluster.Endpoint.Address
  DbClusterPort:
    Description: Cluster port
    Value: !GetAtt RDSCluster.Endpoint.Port
  DbName:
    Description: Database name
    Value: !Ref RDSDatabaseName

```

3. DEPLOY STACK

* You learned so far how to deploy stack, using this knowledge, deploy stack, and verify if db is created 

4. END OF LAB

* Your Aurora serverless is ready to use in the next labs 