# 06. LOAD BALANCER

## LAB PURPOSE

Create Application Load Balancer which will be distribute network traffic across different tasks

## DEFINITIONS
----

### Load Balancer

A load balancer serves as the single point of contact for clients. Clients send requests to the load balancer, and the load balancer sends them to targets, such as EC2 instances, or ECS tasks in two or more Availability Zones.

### Target Group

Target group is used to route requests to one or more registered targets.

### Listeners

A listener is a process that checks for connection requests, using the protocol and port that you configure. The rules that you define for a listener determine how the load balancer routes requests to the targets in one or more target groups.

## STEPS
---

1. CREATE CLOUDFORMATION TEMPLATE

* Rename boilerplate.yaml to worshop-alb.yaml, this is the place where you should put all of your resources

2. CREATE TARGET GROUP

* Fisrt you have to create **Target Group**,  to do that find **AWS::ElasticLoadBalancingV2::TargetGroup** resource in documentation. Find your **VPC ID**, you will need to set those properties:

>TargetType: ip
>Port: 8080
>Protocol: HTTP

Your resource should have those properties:

```yaml
TargetGroupService:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    VpcId: !Ref VpcId
    TargetType: ip
    Port: 8080
    Protocol: HTTP
    HealthCheckIntervalSeconds: 6
```

3. CREATE LOAD BALANCER

* Now you can create load balancer, please use security group created ealier. You can find load balancer in documentation , resource **WS::ElasticLoadBalancingV2::LoadBalancer**, please rememeber that this ALB should be placed in public subnets and should be **internet-facing**

Your resource should have those properties:

```yaml
 LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: !Sub ${ProjectName}-${Environment}-alb
    Scheme: internet-facing
    Subnets: !Ref Subnets
    SecurityGroups:
      - !Ref ALBSecurityGroup
    Tags:
      - Key: Name
        Value: !Ref ALBSecurityGroup
```

4. CREATE LISTENERS

* Listeners are processes that checks for connection requests, using the protocol and port that you configure. The rules that you define for a listener determine how the load balancer routes requests to the targets in one or more target groups. To create them you should create **AWS::ElasticLoadBalancingV2::Listener** on port **8080**, with default action set to **forward** on your **Target Group**

```yaml
LoadBalancerListenerService:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref LoadBalancer
    Port: 8080
    Protocol: HTTP
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref TargetGroupService

```

* Add path-based routing with your application load balancer

```yaml
ListenerRuleService:
    Type: AWS::ElasticLoadBalancingV2::ListenerRule
    Properties:
      ListenerArn: !Ref LoadBalancerListenerService
      Priority: 1
      Conditions:
        - Field: path-pattern
          Values:
            - /
      Actions:
        - TargetGroupArn: !Ref TargetGroupService
          Type: forward
```

5. DEPLOY YOUR TEMPLATE

* The file you have created should contain the same resources:

```yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >
  This template creates  public load balancer, hosted in public subnets that is accessible
  to the public, and is intended to route traffic to  or more public facing services

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
          - Subnets
      - Label:
          default: Security groups
        Parameters:
          - ALBSecurityGroup

Parameters:
  ProjectName:
    Type: String
    Description: Project name, part of the name of all created compnts
  
  Environment:
    Type: String
    AllowedValues:
      - dev
      - test
      - prod

  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: Id of VPC where security groups should be deployed to

  Subnets:
    Description: Subnets where Application Load Balancer should be deployed to
    Type: List<AWS::EC2::Subnet::Id>

  ALBSecurityGroup:
    Description: Select the Security Group to apply to the Application Load Balancer
    Type: AWS::EC2::SecurityGroup::Id

Resources:
  TargetGroupService:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      VpcId: !Ref VpcId
      TargetType: ip
      Port: 8080
      Protocol: HTTP
      HealthCheckIntervalSeconds: 6

  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub ${ProjectName}-${Environment}-alb
      Scheme: internet-facing
      Subnets: !Ref Subnets
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Ref ALBSecurityGroup

  LoadBalancerListenerService:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref LoadBalancer
      Port: 8080
      Protocol: HTTP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroupService

  ListenerRuleService:
    Type: AWS::ElasticLoadBalancingV2::ListenerRule
    Properties:
      ListenerArn: !Ref LoadBalancerListenerService
      Priority: 1
      Conditions:
        - Field: path-pattern
          Values:
            - /
      Actions:
        - TargetGroupArn: !Ref TargetGroupService
          Type: forward
   
Outputs:
  LoadBalancer:
    Description: A reference to the Application Load Balancer
    Value: !Ref LoadBalancer

  LoadBalancerUrl:
    Description: The URL of the ALB
    Value: !GetAtt LoadBalancer.DNSName

  LoadBalancerListenerService:
    Description: A reference to a port 80 listener
    Value: !Ref LoadBalancerListenerService

  TargetGroupService:
    Description: A reference to a target group 
    Value: !Ref TargetGroupService
```

6. VERIFY LOAD BALNCER

* Go to **EC2** instance , section **Load Balancers**, verify what resources have been crated

7. END OF LAB

* Your Load Balancer  is ready to use in the next labs 