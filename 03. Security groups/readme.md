# SECURITY GROUPS SETUP

## LAB PURPOSE

Create security groups which will be used later on for all created components

## DEFINITIONS
----

### Security group

AWS security groups are associated with instances and provide security at the protocol and port access level. Each security group – working much the same way as a firewall – contains a set of rules that filter traffic coming into and out of an EC2 instance. There are no ‘Deny’ rules. Rather, if no rule explicitly permits a particular data packet, it will be dropped.

## STEPS
---

1. CREATE CLOUDFORMATION TEMPLATE

* Rename boilerplate.yaml to workshop-sg.yaml, this is the place where you should put all of your resources

1. CREATE SECURITY GROUP FOR BASTION HOST

* Go to https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html
* Discover how the **Security Group** resource should looks
* Verify which fields are required
* To create a security group you have to get VPC ID, from lab creates earlier. You can do that in the following way:

```bash
aws ec2 describe-vpcs
```

* Find the appropriate vpc id and sssign it to the env variable

```bash
export VPC_ID=YOUR_ID
```

* For bastion host set **SecurityGroupIngress** to allow incoming traffic from **0.0.0.0/0** on port 22, for TCP protocol. This allows you to access your bastion host using SSH (In real life, SSH access should not be open for 0.0.0.0/0 , you should narrow down permission to specific IPs, this configuration is only for workshop purposes). The security group should be similar to this:

```yaml
BastionSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security Group for the public SSH access
    VpcId: !Ref VpcId
    SecurityGroupIngress:
    - CidrIp: 0.0.0.0/0
      FromPort: 22
      ToPort: 22
      IpProtocol: TCP
    Tags:
      - Key: Name
        Value: !Sub ${ProjectName}-${Environment}-sg-bastion
      - Key: Environment
        Value: !Ref Environment
```

The complete template:

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >
  This template creates security groups for ECS and ALB

Parameters:
  ProjectName:
    Type: String
    Description: Project name, part of the name of all created components
  
  Environment:
    Type: String
    AllowedValues:
      - dev
      - test
      - prod
  
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: Id of VPC where security groups should be deployed to

  VpcCidrBlock:
    Type: String
 
Resources:

  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security Group for the public SSH access
      VpcId: !Ref VpcId
      SecurityGroupIngress:
      - CidrIp: 0.0.0.0/0
        FromPort: 22
        ToPort: 22
        IpProtocol: TCP
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-bastion
        - Key: Environment
          Value: !Ref Environment

```

3. DEPLOY SECURITY GROUPS

```bash
aws cloudformation deploy --template-file workshop-sg.yaml --stack-name workshop-sg --parameter-overrides ProjectName=workshop Environment=dev VpcCidrBlock=10.0.0.0/16 VpcId=$VPC_ID
```

4. VERIFY VPC

*  Go to cloudformation console  https://console.aws.amazon.com/cloudformation, find your stack **workshop-sg**, and verify what resources have been created, to do that, go to section **Resources**. 

5. CREATE SECURITY GROUP FOR APPLICATION LOAD BALANCER

* Proceed the same way as in the previous security group. Name your security group **ALBSecurityGroup** and allow all inbound traffic on the load balancer for all protocols. When you finish deploy and verify this security group

```yaml
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !Ref VpcId
      GroupDescription: Security group to access the load balancer
      SecurityGroupIngress:
        - CidrIp: 0.0.0.0/0
          IpProtocol: '-1'
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-alb
```

6. CREATE SECURITY GROUP FOR ECS

* Proceed the same way as in the previous security group. Name your security group **ECSSecurityGroup** and allow all inbound traffic on the ecs only from the load balancer, and allow SSH on 22 port. When you finish deploy and verify this security group

```yaml
ECSSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group to access ECS
    VpcId: !Ref VpcId
    SecurityGroupIngress:
    - CidrIp: 0.0.0.0/0
      FromPort: 22
      ToPort: 22
      IpProtocol: TCP
    - SourceSecurityGroupId: !Ref ALBSecurityGroup
      IpProtocol: '-1'
    Tags:
      - Key: Name
        Value: !Sub ${ProjectName}-${Environment}-sg-ecs
      - Key: Environment
        Value: !Ref Environment
```

7. CREATE SECURITY GROUP FOR DB

* Proceed the same way as in the previous security group. Name your security group **DbSecurityGroup** and allow all inbound on port  3306 only from instances in your VPC. When you finish deploy and verify this security group

```yaml
  DbSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group to access db 
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - CidrIp: !Ref VpcCidrBlock
          FromPort: 3306
          ToPort: 3306
          IpProtocol: TCP
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-db
        - Key: Environment
          Value: !Ref Environment
```

8. THE COMPLETE TEMPLATE

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >
  This template creates security groups for ECS and ALB

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Environment configuration
        Parameters:
          - Environment
          - ProjectName
      - Label:
          default: VPC configuration
        Parameters:
          - VpcId
          - VpcCidrBlock

Parameters:
  ProjectName:
    Type: String
    Description: Project name, part of the name of all created components
  
  Environment:
    Type: String
    AllowedValues:
      - dev
      - test
      - prod
  
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: Id of VPC where security groups should be deployed to

  VpcCidrBlock:
    AllowedPattern: '((\d{1,3})\.){3}\d{1,3}/\d{1,2}'
    Type: String
 

Resources:
  DbSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group to access db 
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - CidrIp: !Ref VpcCidrBlock
          FromPort: 3306
          ToPort: 3306
          IpProtocol: TCP
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-db
        - Key: Environment
          Value: !Ref Environment

  ECSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group to access ECS
      VpcId: !Ref VpcId
      SecurityGroupIngress:
      - CidrIp: 0.0.0.0/0
        FromPort: 22
        ToPort: 22
        IpProtocol: TCP
      - SourceSecurityGroupId: !Ref ALBSecurityGroup
        IpProtocol: '-1'
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-ecs
        - Key: Environment
          Value: !Ref Environment
    

  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !Ref VpcId
      GroupDescription: Security group to access the load balancer
      SecurityGroupIngress:
        - CidrIp: 0.0.0.0/0
          IpProtocol: '-1'
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-alb


  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security Group for the public SSH access
      VpcId: !Ref VpcId
      SecurityGroupIngress:
      - CidrIp: 0.0.0.0/0
        FromPort: 22
        ToPort: 22
        IpProtocol: TCP
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-${Environment}-sg-bastion
        - Key: Environment
          Value: !Ref Environment

Outputs:
  ECSSecurityGroup:
    Description: ECS security group
    Value: !Ref ECSSecurityGroup

  ALBSecurityGroup:
    Description: ALB security group
    Value: !Ref ALBSecurityGroup

  DbSecurityGroup:
    Description: DB security group
    Value: !Ref DbSecurityGroup

  BastionSecurityGroup:
    Description: Bastion host security group
    Value: !Ref BastionSecurityGroup
```

9. END OF LAB

* Your security groups are ready to use in next labs 
