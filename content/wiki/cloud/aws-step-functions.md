---
type: concept
category: cloud
para: resource
tags: [aws, step-functions, state-machine, orchestration, serverless]
sources: []
updated: 2026-05-01
---

# AWS Step Functions

Serverless orchestration for distributed workflows. Coordinates Lambda functions, ECS tasks, SQS, SNS, DynamoDB, and 200+ AWS services into reliable state machines. Handles retries, error catching, and parallel execution.

---

## Standard vs Express Workflows

| | Standard | Express |
|---|---|---|
| Duration | Up to 1 year | Up to 5 minutes |
| Execution model | Exactly-once | At-least-once |
| Pricing | Per state transition | Per execution + duration |
| History | Full CloudWatch Logs | CloudWatch Logs (optional) |
| Use case | Business processes, long-running | High-volume, short workflows |

---

## State Types

| State | Purpose |
|---|---|
| `Task` | Invoke Lambda, ECS, SDK integrations |
| `Choice` | Branch based on condition |
| `Wait` | Pause for duration or until timestamp |
| `Parallel` | Run branches concurrently |
| `Map` | Iterate over array items |
| `Pass` | Transform/inject data |
| `Succeed` | End successfully |
| `Fail` | End with error |

---

## State Machine Definition (ASL)

```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:eu-west-1:123456789:function:validate-order",
      "Next": "CheckInventory",
      "Retry": [
        {
          "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["ValidationError"],
          "Next": "RejectOrder",
          "ResultPath": "$.error"
        }
      ]
    },
    "CheckInventory": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.inStock",
          "BooleanEquals": true,
          "Next": "ProcessPayment"
        }
      ],
      "Default": "BackorderItem"
    },
    "ProcessPayment": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "ChargeCard",
          "States": {
            "ChargeCard": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:eu-west-1:123456789:function:charge-card",
              "End": true
            }
          }
        },
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "arn:aws:states:::sns:publish",
              "Parameters": {
                "TopicArn": "arn:aws:sns:eu-west-1:123456789:order-notifications",
                "Message.$": "States.Format('Order {} confirmed', $.orderId)"
              },
              "End": true
            }
          }
        }
      ],
      "Next": "FulfillOrder"
    },
    "FulfillOrder": {
      "Type": "Map",
      "ItemsPath": "$.items",
      "MaxConcurrency": 5,
      "Iterator": {
        "StartAt": "ShipItem",
        "States": {
          "ShipItem": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:eu-west-1:123456789:function:ship-item",
            "End": true
          }
        }
      },
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "RejectOrder": {
      "Type": "Fail",
      "Error": "OrderRejected",
      "Cause": "Validation failed"
    },
    "BackorderItem": {
      "Type": "Wait",
      "Seconds": 86400,
      "Next": "CheckInventory"
    }
  }
}
```

---

## SDK Integrations (Optimistic vs Request-Response)

```json
// Optimistic integration — Step Functions waits for the service call
{
  "Type": "Task",
  "Resource": "arn:aws:states:::dynamodb:putItem",
  "Parameters": {
    "TableName": "Orders",
    "Item": {
      "orderId": {"S.$": "$.orderId"},
      "status": {"S": "PROCESSING"}
    }
  }
}

// Wait for task token — Lambda sends token back when done
{
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
  "Parameters": {
    "FunctionName": "manual-approval",
    "Payload": {
      "taskToken.$": "$$.Task.Token",
      "orderId.$": "$.orderId"
    }
  }
}
```

```python
# Lambda sends task token back after human review
import boto3

def lambda_handler(event, context):
    sfn = boto3.client('stepfunctions')
    sfn.send_task_success(
        taskToken=event['taskToken'],
        output='{"approved": true}'
    )
```

---

## Triggering Step Functions

```python
import boto3, json

sfn = boto3.client('stepfunctions', region_name='eu-west-1')

response = sfn.start_execution(
    stateMachineArn='arn:aws:states:eu-west-1:123456789:stateMachine:OrderWorkflow',
    name='order-12345',
    input=json.dumps({'orderId': '12345', 'items': [{'sku': 'A1', 'qty': 2}]})
)

execution_arn = response['executionArn']

# Check status
status = sfn.describe_execution(executionArn=execution_arn)
print(status['status'])   # RUNNING | SUCCEEDED | FAILED | TIMED_OUT | ABORTED
```

---

## CDK Example

```python
from aws_cdk import aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks

validate = tasks.LambdaInvoke(self, "Validate",
    lambda_function=validate_fn,
    output_path="$.Payload",
)
process = tasks.LambdaInvoke(self, "Process",
    lambda_function=process_fn,
    output_path="$.Payload",
)

definition = validate.next(process)

state_machine = sfn.StateMachine(self, "OrderWorkflow",
    definition=definition,
    timeout=Duration.minutes(5),
)
```

---

## Connections
[[cloud-hub]] · [[cloud/aws-lambda-patterns]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-cdk]] · [[cloud/cloud-monitoring]] · [[llms/ae-hub]]
