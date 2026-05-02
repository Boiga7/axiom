---
type: concept
category: cs-fundamentals
para: resource
tags: [message-queues, rabbitmq, kafka, sqs, async, pub-sub, dead-letter-queue]
sources: []
updated: 2026-05-01
tldr: "Asynchronous communication between services. Queues decouple producers from consumers: the producer doesn't wait for the consumer; the consumer processes at its own pace."
---

# Message Queues

Asynchronous communication between services. Queues decouple producers from consumers: the producer doesn't wait for the consumer; the consumer processes at its own pace.

---

## Queues vs Pub/Sub vs Streaming

```
Queue (point-to-point):
  One message → one consumer (competing consumers)
  Consumer acknowledges → message deleted
  Use: task distribution, work queues, background jobs
  Tools: SQS, RabbitMQ queues

Pub/Sub (one-to-many):
  One message → many consumers (each gets their own copy)
  Publisher doesn't know consumers
  Messages often ephemeral (no long-term storage)
  Use: broadcast notifications, event fan-out
  Tools: SNS, RabbitMQ exchanges (fanout), Google Pub/Sub

Streaming (ordered log):
  Messages retained on disk; consumers track their position
  Consumers can replay from any offset
  Multiple consumer groups, each with their own position
  Use: event sourcing, audit logs, analytics, high-throughput processing
  Tools: Kafka, Kinesis, Pulsar
```

---

## RabbitMQ — Python (pika)

```python
# producer.py
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters(host="localhost"))
channel = connection.channel()

# Declare exchange and queue
channel.exchange_declare(exchange="orders", exchange_type="direct", durable=True)
channel.queue_declare(queue="order_processing", durable=True)
channel.queue_bind(exchange="orders", queue="order_processing", routing_key="new")

# Publish with persistent delivery mode (survives broker restart)
channel.basic_publish(
    exchange="orders",
    routing_key="new",
    body=json.dumps({"order_id": "ord-123", "user_id": "u-001", "total": 49.99}),
    properties=pika.BasicProperties(
        delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE,
        content_type="application/json",
    )
)
connection.close()

# consumer.py
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters(host="localhost"))
channel = connection.channel()

channel.basic_qos(prefetch_count=1)  # one message at a time per consumer

def process_order(ch, method, properties, body):
    import json
    order = json.loads(body)
    try:
        fulfill_order(order)
        ch.basic_ack(delivery_tag=method.delivery_tag)  # success: remove from queue
    except Exception as e:
        print(f"Failed to process order: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)  # dead-letter

channel.basic_consume(queue="order_processing", on_message_callback=process_order)
channel.start_consuming()
```

---

## Dead Letter Queue Pattern

```python
# RabbitMQ — route failed messages to DLQ automatically
channel.queue_declare(
    queue="order_processing",
    durable=True,
    arguments={
        "x-dead-letter-exchange": "orders.dlx",   # failed messages go here
        "x-message-ttl": 30000,                   # messages expire after 30s if not ACKed
        "x-max-retries": 3,                       # custom header for retry counting
    }
)

# SQS — built-in DLQ support
# In Terraform:
resource "aws_sqs_queue" "dlq" {
  name = "order-processing-dlq"
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "main" {
  name = "order-processing"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3   # after 3 failed attempts → DLQ
  })
}
```

---

## AWS SQS — Python (boto3)

```python
import boto3
import json
import time

sqs = boto3.client("sqs", region_name="eu-west-1")
QUEUE_URL = "https://sqs.eu-west-1.amazonaws.com/123456789/order-processing"

# Producer
def enqueue_order(order_id: str, total: float):
    sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps({"order_id": order_id, "total": total}),
        MessageGroupId="orders",         # FIFO queue group
        MessageDeduplicationId=order_id,  # prevent duplicates
    )

# Consumer — long polling for efficiency
def consume_orders():
    while True:
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20,          # long poll: wait up to 20s for messages
            VisibilityTimeout=60,        # process within 60s or message reappears
        )

        messages = response.get("Messages", [])
        for message in messages:
            body = json.loads(message["Body"])
            try:
                process_order(body)
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=message["ReceiptHandle"],
                )
            except Exception as e:
                print(f"Failed: {e}")
                # Don't delete — message will reappear after VisibilityTimeout
                # After maxReceiveCount failures → moves to DLQ
```

---

## Kafka — Python (confluent-kafka)

```python
# producer.py
from confluent_kafka import Producer

producer = Producer({"bootstrap.servers": "kafka:9092"})

def delivery_report(err, msg):
    if err:
        raise RuntimeError(f"Message delivery failed: {err}")

producer.produce(
    topic="orders",
    key="order-123",                    # same key → same partition → ordering
    value='{"order_id": "123"}',
    callback=delivery_report,
)
producer.flush()  # wait for all messages to be delivered

# consumer.py — multiple consumer groups can independently read the same topic
from confluent_kafka import Consumer

consumer = Consumer({
    "bootstrap.servers": "kafka:9092",
    "group.id": "fulfilment-service",
    "auto.offset.reset": "earliest",    # start from beginning if no prior offset
    "enable.auto.commit": False,        # manual commit = at-least-once processing
})

consumer.subscribe(["orders"])

try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Error: {msg.error()}")
            continue

        process_order(msg.value())
        consumer.commit(msg)            # commit offset after successful processing
finally:
    consumer.close()
```

---

## Choosing the Right Tool

```
SQS:       Simple, managed, pay-per-message. Good for AWS-native apps, task queues.
           Max retention 14 days. No ordering guarantee (FIFO queue adds it).

RabbitMQ:  Flexible routing (exchanges/bindings), acknowledgements, plugins.
           Good for complex routing rules, when you need message priorities.
           Requires infrastructure management.

Kafka:     Ordered, replayable log. High throughput (millions/sec).
           Consumer groups can process the same stream independently.
           Good for event sourcing, analytics pipelines, audit logs.
           Retention configurable (days to forever).

SNS+SQS:  Fan-out: SNS publishes → multiple SQS queues subscribe independently.
           Classic pattern for event-driven microservices in AWS.
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/event-driven-architecture]] · [[cs-fundamentals/distributed-systems]] · [[cloud/aws-sqs-sns]] · [[cs-fundamentals/microservices-patterns]] · [[llms/ae-hub]]
