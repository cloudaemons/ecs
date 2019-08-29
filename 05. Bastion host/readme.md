# 04. BASTION HOST

## LAB PURPOSE

Create a bastion host that will be used to access the database.

## DEFINITIONS
----

### Bastion Host

Bastion host in your VPC environment enables you to securely connect to your Linux instances without exposing your environment to the Internet. After you set up your bastion hosts, you can access the other instances in your VPC through Secure Shell (SSH) connections on Linux. Bastion hosts are also configured with security groups to provide fine-grained ingress control.

## STEPS
---

1. CREATE CLOUDFORMATION TEMPLATE

* Rename boilerplate.yaml to worshop-bastion.yaml, this is the place where you should put all of your resources

2. CREATE BASTION HOST

* So far you created bastion host security group
* To create bastion host you need also have SSH key pairs, to create it go to https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#KeyPairs:sort=keyName
* Save the key locally 
* Now you have everything. To create Bastion you have to create EC Instance located in public subnet. Go to (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-instance.html) and verify what is needed to create an instance.
* Please remember to apply security groups created earlier.
* Your script should be similar to:

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >
  This template creates a bastion host to access resources in private subnets

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Environment configuration
        Parameters:
          - ProjectName
          - Environment
      - Label:
          default: Bastion configuration
        Parameters:
          - BastionInstanceType
          - BastionSshSecurityGroupId
     
Parameters:
  ProjectName:
    Type: String
  Environment:
    Type: String
    AllowedValues:
      - dev
      - test
      - prod
  BastionInstanceType:
    Type: String
    Default: t3.micro
  BastionSshSecurityGroupId:
    Type: AWS::EC2::SecurityGroup::Id
  PublicSubnetId:
    Type: AWS::EC2::Subnet::Id
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName

Resources:
  Bastion:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref BastionInstanceType
      ImageId: ami-0a4b1c83cdc2119aa
      SubnetId: !Ref PublicSubnetId
      SecurityGroupIds:
      - !Ref BastionSshSecurityGroupId
      KeyName: !Ref KeyName
      Monitoring: false
      DisableApiTermination: false
      Tags:
      - Key: Name
        Value: !Sub ${ProjectName}-${Environment}-bastion
      - Key: Environment
        Value: !Ref Environment
      UserData:
        !Base64 |
          #!/bin/bash -ex
          yum -y install mysql

Outputs:
  BastionAddress:
    Description: EC2 Bastion address
    Value: !GetAtt Bastion.PublicDnsName
```

3. DEPLOY THE STACK

4. SSH TO BASTION HOST

* Go to **AWS Console** and find your created EC2 Instance
* Select your instance and click **Connect** button
* Follow the instructions, and ssh to your EC2
* From this instance you should have an access database

5. END OF LAB

* Your Bastion Host is ready to use in the next labs 