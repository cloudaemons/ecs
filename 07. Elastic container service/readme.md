# 07. ECS Container

## LAB PURPOSE

Create backend appliaction which will be using ECS and Farage Containers

## DEFINITIONS
----

### ECS Cluser

An Amazon ECS cluster is a logical grouping of tasks or services. 

### Task definition

Configuration file with meta information about docker containers to be deployed within given task, together with AWS specific configuration

### Task

 Running representation of a Task Definition.

### Service

Autoscaling service for ECS. Manages number of running tasks and supports loadbalancing

### Repository
Also known as ECR, repository for docker images

## STEPS
---

1. CREATE CLOUDFORMATION TEMPLATE

* Rename boilerplate.yaml to worshop-ecs.yaml, this is the place where you should put all of your resources

2. Create Service-Linked Roles for Amazon ECS on your account (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-service-linked-roles.html)

> aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com

3. CREATE ECR REPOSITORY

```yaml
 EcrRepository:
    Type: AWS::ECR::Repository
    DeletionPolicy: Retain
```

5. DEPLOY YOUR STACK

6. PUSH DOCKER IMAGE TO ECR

* Go to direcory **microsite** and follow the instruction from readme.md

7. CREATE ECS CLUSTER

```yaml
  EcsCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub ${ProjectName}-${Environment}-cluster
```

8. CREATE TASK ROLE

* Task role is IAM role for each task definition that needs permission to call AWS APIs

```yaml
TaskRole: 
  Type: AWS::IAM::Role
  Properties: 
    AssumeRolePolicyDocument: 
      Version: 2012-10-17
      Statement:
        - Effect: Allow
          Action: sts:AssumeRole
          Principal:
            Service:
              - ecs-tasks.amazonaws.com
    Policies:
      - PolicyName: !Sub ${ProjectName}-${Environment}-ecs-policy
        PolicyDocument:
          Version: 2012-10-17
          Statement:
            - Resource: '*'
              Effect: Allow
              Action: 's3:*'
    Path: /
```

9. CREATE TASK EXECUTION ROLE

* Task execution role is role for the ECS container agent. This agent makes calls to the Amazon ECS API on your behalf, so it requires an IAM policy and role for the service to know that the agent belongs to you.

```yaml
TaskExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: 2012-10-17
      Statement:
        - Effect: Allow
          Action: sts:AssumeRole
          Principal:
            Service: ecs-tasks.amazonaws.com
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AmazoneCSTaskExecutionRolePolicy
    Path: /

```

10. CREATE TASK DEFINITIONS

* Create task definition for your microservice with one container working one 8080. Set up **Memory**, **Cpu** Pass to the container all neccessary **Environment Variables**, and set specify **Fargate** mode for the task. Example you can find below. Logs should be sent to Cloud Watch Logs, so you have to create also CloudWatch Groups. Example of the resource:

```yaml
  CloudWatchLogsGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub ${ProjectName}-${Environment}-microservice
      RetentionInDays: 7
  
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub ${ProjectName}-${Environment}-microservice
      TaskRoleArn: !GetAtt TaskRole.Arn
      ExecutionRoleArn: !GetAtt TaskExecutionRole.Arn
      Memory: !Ref FargateMemory
      Cpu: !Ref FargateCpu
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ContainerDefinitions:
        - Name: !Sub ${ProjectName}-${Environment}-microservice
          Memory: !Ref FargateMemory
          Cpu: !Ref FargateCpu
          Image: !Ref DockerImageTag
          Environment:
            - Name: ENVIRONMENT
              Value: !Ref Environment
            - Name: PORT
              Value: !Ref ContainerPort
            - Name: HOST
              Value: !Ref DbHost
            - Name: USER
              Value: !Ref DbUser
            - Name: PASSWORD
              Value: !Ref DbPassword

          PortMappings:
            - ContainerPort: !Ref ContainerPort
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref CloudWatchLogsGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: !Ref AWS::StackName
```

10. CREATE SERVICE

* Service is autoscaling service for ECS. Manage number of running tasks and supports loadbalancing, we need to have this resoure to by created with **Launch Type** set to FARGATE 

```yaml

EcsService:
  Type: AWS::ECS::Service
  Properties: 
    Cluster: !Ref EcsCluster
    ServiceName: !Sub ${ProjectName}-${Environment}-microservice
    LaunchType: FARGATE
    TaskDefinition: !Ref TaskDefinition
    DesiredCount: 2
    DeploymentConfiguration:
      MaximumPercent: 100
      MinimumHealthyPercent: 0
    NetworkConfiguration:
      AwsvpcConfiguration:
        SecurityGroups: !Ref SecurityGroupIds
        Subnets: !Ref SubnetIds
    LoadBalancers:
      - ContainerName: !Sub ${ProjectName}-${Environment}-microservice
        ContainerPort: !Ref ContainerPort
        TargetGroupArn: !Ref TargetGroup

```

11. AUTOSCALING

* Analize the code bellow, it allows you to scale your tasks based on memory utilisation. Could you discover for what each part is responsible for

```yaml
AutoScalingRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Statement:
      - Effect: Allow
        Principal:
          Service:
            - application-autoscaling.amazonaws.com
        Action: 
          - sts:AssumeRole
    Path: /
    Policies:
    - PolicyName: service-autoscaling
      PolicyDocument:
        Statement:
        - Effect: Allow
          Action: 
            - application-autoscaling:*
            - cloudwatch:DescribeAlarms
            - cloudwatch:PutMetricAlarm
            - ecs:DescribeServices
            - ecs:UpdateService
          Resource: "*"


  # Enable autoscaling for the service
  ScalableTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      ServiceNamespace: ecs
      MaxCapacity: 10
      MinCapacity: 2
      ScalableDimension: ecs:service:DesiredCount
      ResourceId:
        !Join
          - '/'
          - - service
            - !Ref EcsCluster
            - !GetAtt EcsService.Name
      RoleARN: !GetAtt AutoScalingRole.Arn

  # Create scaling policies that describe how to scale the service up and down.
  ScaleDownPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    DependsOn: ScalableTarget
    Properties:
      PolicyName: !Sub ${ProjectName}-${Environment}-scale-down
      PolicyType: StepScaling
      ResourceId:
        Fn::Join:
          - '/'
          - - service
            - !Ref EcsCluster
            - !GetAtt EcsService.Name
      ScalableDimension: ecs:service:DesiredCount
      ServiceNamespace: ecs
      StepScalingPolicyConfiguration:
        AdjustmentType: ChangeInCapacity
        StepAdjustments:
          - MetricIntervalUpperBound: 0
            ScalingAdjustment: -1
        MetricAggregationType: Average
        Cooldown: 60

  ScaleUpPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    DependsOn: ScalableTarget
    Properties:
      PolicyName: !Sub ${ProjectName}-${Environment}-scale-up
      PolicyType: StepScaling
      ResourceId:
        Fn::Join:
          - '/'
          - - service
            - !Ref EcsCluster
            - !GetAtt EcsService.Name
      ScalableDimension: ecs:service:DesiredCount
      ServiceNamespace: ecs
      StepScalingPolicyConfiguration:
        AdjustmentType: ChangeInCapacity
        StepAdjustments:
          - MetricIntervalLowerBound: 0
            MetricIntervalUpperBound: 15
            ScalingAdjustment: 1
          - MetricIntervalLowerBound: 15
            MetricIntervalUpperBound: 25
            ScalingAdjustment: 2
          - MetricIntervalLowerBound: 25
            ScalingAdjustment: 3
        MetricAggregationType: Average
        Cooldown: 60

  # Create alarms to trigger the scaling policies
  LowMemoryUsageAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub ${ProjectName}-${Environment}-low-memory
      AlarmDescription: !Sub Low memory utilization for service ${EcsService} in environment ${Environment}
      MetricName: MemoryUtilization
      Namespace: AWS/ECS
      Dimensions:
        - Name: ServiceName
          Value: !GetAtt EcsService.Name
        - Name: ClusterName
          Value: !Ref EcsCluster
      Statistic: Average
      Period: 60
      EvaluationPeriods: 1
      Threshold: 20
      ComparisonOperator: LessThanOrEqualToThreshold
      AlarmActions:
        - !Ref ScaleDownPolicy

  HighMemoryUsageAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub ${ProjectName}-${Environment}-high-memory
      AlarmDescription: !Sub High memory utilization for service ${EcsService} in environment ${Environment}
      MetricName: MemoryUtilization
      Namespace: AWS/ECS
      Dimensions:
        - Name: ServiceName
          Value: !GetAtt EcsService.Name
        - Name: ClusterName
          Value: !Ref EcsCluster
      Statistic: Average
      Period: 60
      EvaluationPeriods: 1
      Threshold: 70
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref ScaleUpPolicy
```

12. DEPLOY THE STACK

13. VERIFY YOUR BACKEND

* Go to your load balancer, find the url , if everyting is working ok, you should see the responses from DB

14. END OF LAB

* Your backend  is ready to use in the next labs 
