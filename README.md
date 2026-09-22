# Order Management System

A backend learning project built with **Node.js, LoopBack 3, PostgreSQL, Redis, RabbitMQ, and Node-RED**.

The project demonstrates how a traditional REST-based order management application can be extended with **caching, asynchronous processing, independent workers, message acknowledgements, retry handling, idempotency, distributed locking, and real-time application-flow monitoring**.

The main objective of this project is to understand how different backend components work together in a distributed application rather than building only a CRUD-based API.

---

## 1. Project Objectives

The project was developed to learn and demonstrate:

* REST API development using LoopBack 3
* PostgreSQL database integration
* Service and repository based backend structure
* Redis caching and worker state management
* RabbitMQ-based asynchronous communication
* Event-driven architecture
* Independent background workers
* Message acknowledgement and retry handling
* Idempotent worker processing
* Redis-based distributed locking
* Node-RED based application monitoring and debugging
* Integration of multiple backend infrastructure components
* Separation of synchronous API processing from asynchronous business operations

---

## 2. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │      Client/API      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    LoopBack 3 API   │
                         │                     │
                         │  Order Controller   │
                         │  Order Service      │
                         │  Models             │
                         └──────────┬──────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
              ┌─────────────────┐       ┌─────────────────┐
              │   PostgreSQL    │       │      Redis      │
              │                 │       │                 │
              │ Customer        │       │ Product Cache   │
              │ Product         │       │ Worker State    │
              │ Order           │       │ Retry Count     │
              │ OrderItem       │       │ Distributed     │
              │ Payment         │       │ Lock            │
              └─────────────────┘       └─────────────────┘
                       │
                       │ Order Created Event
                       ▼
              ┌─────────────────────┐
              │      RabbitMQ       │
              │                     │
              │  Exchange:          │
              │  order.events       │
              │  Type: topic        │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
 ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐
 │ Payment Worker │ │Inventory Worker│ │Notification      │
 │                │ │                │ │Worker            │
 │ payment.queue  │ │inventory.queue │ │notification.queue │
 └────────────────┘ └────────────────┘ └──────────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                ┌──────────────────┐
                │    Node-RED      │
                │                  │
                │ Monitoring       │
                │ Debugging        │
                │ Event Flow       │
                │ ACK/NACK         │
                │ Redis State      │
                └──────────────────┘
```

---

# 3. Order Processing Flow

The main business flow is:

```text
Client
  │
  │ POST /api/orders/create
  ▼
LoopBack API
  │
  ├── Validate Customer
  │
  ├── Validate Order Items
  │
  ├── Validate Products
  │
  ├── Check Stock
  │
  ├── Calculate Total
  │
  ├── Create Order
  │
  ├── Create Order Items
  │
  └── Publish order.created
              │
              ▼
         RabbitMQ
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
   Payment  Inventory Notification
    Worker    Worker      Worker
       │        │           │
       └────────┼───────────┘
                ▼
             Redis
      ┌────────────────────┐
      │ Processing status  │
      │ Completed status   │
      │ Retry count        │
      │ Distributed lock   │
      └────────────────────┘
```

The REST API handles the initial order creation synchronously, while payment, inventory and notification operations are processed asynchronously using RabbitMQ workers.

---

# 4. Technology Stack

| Technology | Purpose                                      |
| ---------- | -------------------------------------------- |
| Node.js    | Runtime                                      |
| LoopBack 3 | REST API framework                           |
| PostgreSQL | Primary relational database                  |
| Redis      | Cache and distributed worker state           |
| RabbitMQ   | Asynchronous messaging                       |
| Node-RED   | Monitoring, debugging and flow visualization |
| JavaScript | Application development                      |
| ESLint     | Code quality                                 |

---

# 5. Project Structure

```text
order-management/
│
├── server/
│   ├── boot/
│   │   ├── 02-database.js
│   │   ├── 03-redis.js
│   │   ├── 04-rabbitmq.js
│   │   ├── 05-node-red-proxy.js
│   │   └── authentication.js
│   │
│   ├── models/
│   │   ├── customer.js
│   │   ├── customer.json
│   │   ├── product.js
│   │   ├── product.json
│   │   ├── order.js
│   │   ├── order.json
│   │   ├── order-item.js
│   │   ├── order-item.json
│   │   ├── payment.js
│   │   └── payment.json
│   │
│   ├── services/
│   │   ├── order-service.js
│   │   ├── inventory-service.js
│   │   ├── payment-service.js
│   │   ├── redis-service.js
│   │   ├── postgres-service.js
│   │   └── worker-state.js
│   │
│   ├── repositories/
│   │   ├── inventory-repository.js
│   │   └── payment-repository.js
│   │
│   ├── messaging/
│   │   ├── rabbitmq.js
│   │   ├── publisher.js
│   │   └── node-red-notifier.js
│   │
│   ├── datasources.json
│   ├── model-config.json
│   └── server.js
│
├── workers/
│   ├── payment-worker.js
│   ├── inventory-worker.js
│   └── notification-worker.js
│
├── node-red/
│   ├── flows.json
│   ├── flows_cred.json
│   ├── settings.js
│   └── package.json
│
├── client/
│
├── package.json
└── README.md
```

---

# 6. Database Design

PostgreSQL is used as the primary persistent data store.

### Main entities

```text
Customer
   │
   │ 1:N
   ▼
 Order
   │
   ├───────────────┐
   │               │
   │ 1:N           │ 1:1
   ▼               ▼
OrderItem        Payment
   │
   │ N:1
   ▼
Product
```

### Customer

Stores customer information.

Main fields:

* `id`
* `name`
* `email`
* `phone`
* `createdAt`
* `updatedAt`

### Product

Stores product information.

Main fields:

* `id`
* `name`
* `description`
* `price`
* `stock`
* `createdAt`
* `updatedAt`

### Order

Stores order-level information.

Main fields:

* `id`
* `customerId`
* `totalAmount`
* `status`
* `createdAt`
* `updatedAt`

### OrderItem

Stores individual products belonging to an order.

Main fields:

* `id`
* `orderId`
* `productId`
* `quantity`
* `price`

### Payment

Stores payment processing information.

Main fields:

* `id`
* `orderId`
* `amount`
* `status`
* `transactionId`
* `paymentMethod`
* `createdAt`
* `updatedAt`

---

# 7. LoopBack 3 API

LoopBack 3 is responsible for:

* Model definition
* REST API generation
* Database connectivity
* Remote methods
* Model relationships
* Application bootstrapping

A custom remote method is implemented for order creation:

```http
POST /api/orders/create
```

Example request:

```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

The order service then:

1. Validates the customer.
2. Validates the order items.
3. Fetches each product.
4. Checks available stock.
5. Calculates the order total.
6. Creates the order.
7. Creates order items.
8. Publishes an `order.created` event to RabbitMQ.

---

# 8. Service Layer

Business logic is separated from the LoopBack model definitions.

For example:

```text
Order Model
     │
     ▼
Order Service
     │
     ├── Customer validation
     ├── Product validation
     ├── Stock validation
     ├── Total calculation
     ├── Order creation
     ├── Order item creation
     └── RabbitMQ event publishing
```

This separation makes the business logic easier to understand, test and maintain.

---

# 9. Repository Layer

Repositories are used for database operations that are directly related to infrastructure-specific queries.

Examples:

```text
inventory-repository.js
payment-repository.js
```

The inventory repository contains operations such as:

```text
getProduct()
reduceStock()
```

The payment repository handles payment persistence.

This provides a separation between:

```text
Business Logic
      ↓
Service
      ↓
Repository
      ↓
PostgreSQL
```

---

# 10. Redis

Redis is used for two main purposes.

## 10.1 Product Caching

The product API implements a cache-aside/read-through style pattern:

```text
Request
   │
   ▼
Redis
   │
   ├── Cache HIT ──────► Return product
   │
   └── Cache MISS
           │
           ▼
       PostgreSQL
           │
           ▼
       Store in Redis
           │
           ▼
       Return product
```

Cache keys follow the pattern:

```text
product:<productId>
```

Example:

```text
product:1
product:2
```

The product cache currently uses a TTL of 5 minutes.

---

# 11. Redis Worker State

Redis is also used to maintain worker state.

Example keys:

```text
worker:payment:order:101:status
worker:payment:order:101:retry
worker:payment:order:101:lock
```

The worker state can represent:

```text
processing
completed
failed
```

Redis also maintains:

* Retry count
* Processing lock
* Completion state

---

# 12. Idempotency

The workers implement an idempotency mechanism.

Before processing an order, the worker checks whether that order has already been completed.

```text
Message received
       │
       ▼
Is order already completed?
       │
   ┌───┴────┐
   │        │
  YES       NO
   │        │
   ▼        ▼
 Skip     Acquire lock
            │
            ▼
        Process order
            │
            ▼
        Mark completed
```

This prevents duplicate processing when the same RabbitMQ message is delivered more than once.

---

# 13. Distributed Locking

Redis `SET` with `NX` and expiration is used to acquire a worker lock.

Conceptually:

```text
SET worker:<worker>:order:<id>:lock 1 EX 60 NX
```

This means only one worker instance can acquire the lock for the same worker/order combination within the lock period.

This helps prevent concurrent duplicate processing.

---

# 14. RabbitMQ

RabbitMQ is used to decouple order creation from downstream processing.

The application publishes an event:

```text
Exchange:
order.events

Exchange Type:
topic

Routing Key:
order.created
```

The event contains information about the newly created order.

---

# 15. RabbitMQ Workers

Three independent consumers are implemented.

### Payment Worker

Queue:

```text
payment.queue
```

Responsibilities:

* Consume `order.created`
* Process payment
* Generate a mock transaction ID
* Store payment information
* ACK the message after successful processing

---

### Inventory Worker

Queue:

```text
inventory.queue
```

Responsibilities:

* Consume `order.created`
* Validate product availability
* Reduce product stock
* ACK the message after successful processing

---

### Notification Worker

Queue:

```text
notification.queue
```

Responsibilities:

* Consume `order.created`
* Simulate notification processing
* Publish notification status
* ACK the message after successful processing

---

# 16. RabbitMQ ACK/NACK

Successful processing:

```text
Worker
  │
  ▼
Process message
  │
  ▼
channel.ack(message)
```

Failed processing:

```text
Worker
  │
  ▼
Processing failure
  │
  ▼
Increment retry count
  │
  ▼
channel.nack(message, false, true)
  │
  ▼
Message requeued
```

After the configured maximum number of retries, the message is finally acknowledged and removed instead of being continuously reprocessed.

The current maximum retry count is:

```text
5
```

---

# 17. Node-RED

Node-RED is used as an application monitoring and debugging layer.

It does **not duplicate the core business logic**.

The application sends lifecycle events to Node-RED, including:

```text
order.received
database.customer.validated
database.product.validated
database.order.created
database.order-item.created
api.order.completed

rabbitmq.event.published
rabbitmq.payment.received
rabbitmq.inventory.received
rabbitmq.notification.received

payment.processed
inventory.updated
notification.sent

redis.lock.acquired
redis.worker.processing
redis.worker.completed
redis.retry.incremented

rabbitmq.*.ack
rabbitmq.*.nack-requeue
rabbitmq.*.final-ack
```

This provides a visual representation of the application lifecycle.

---

# 18. Node-RED Integration

Node-RED is also exposed through the LoopBack application using a proxy.

Examples:

```text
http://localhost:3001/node-red/
```

and:

```text
http://localhost:3001/red/
```

This allows the application API and Node-RED interface to be accessed through the same LoopBack server.

---

# 19. End-to-End Example

Suppose a client creates an order:

```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

The complete flow is:

```text
1. Client sends order
        ↓
2. LoopBack receives request
        ↓
3. Customer validated
        ↓
4. Product validated
        ↓
5. Stock validated
        ↓
6. Total amount calculated
        ↓
7. Order created in PostgreSQL
        ↓
8. Order items created
        ↓
9. order.created published
        ↓
10. RabbitMQ distributes event
        ↓
 ┌──────┼────────┐
 ▼      ▼        ▼
Payment Inventory Notification
Worker    Worker      Worker
 │          │           │
 ▼          ▼           ▼
Payment   Stock       Notification
created   reduced       sent
 │          │           │
 └──────────┼───────────┘
            ▼
       Redis state
            ↓
     Node-RED monitoring
```

---

# 20. Running the Project

## Prerequisites

Install and run:

* Node.js
* PostgreSQL
* Redis
* RabbitMQ
* Node-RED

Verify the services are running before starting the application.

---

## Install Dependencies

```bash
npm install
```

---

## Configure PostgreSQL

Create the database:

```text
order_management
```

Configure the application connection using environment variables or the LoopBack datasource configuration.

Recommended environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=5433
export DB_NAME=order_management
export DB_USER=order_app
export DB_PASSWORD=<your-password>
```

---

## Start LoopBack API

```bash
npm start
```

The API runs on the configured application port.

LoopBack Explorer is available at:

```text
/explorer
```

---

## Start Node-RED

```bash
npm run node-red
```

Node-RED runs on its configured port and is proxied through the LoopBack application.

---

## Start Payment Worker

```bash
npm run worker:payment
```

---

## Start Inventory Worker

```bash
npm run worker:inventory
```

---

## Start Notification Worker

```bash
npm run worker:notification
```

For local development, the API and the three workers should be running simultaneously.

---

# 21. Testing the Main Flow

A sample order can be sent using:

```http
POST /api/orders/create
```

Example:

```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 1
    }
  ]
}
```

After the order is created:

1. PostgreSQL stores the order.
2. RabbitMQ receives `order.created`.
3. Payment worker consumes the event.
4. Inventory worker consumes the event.
5. Notification worker consumes the event.
6. Redis records worker state.
7. Node-RED displays the application lifecycle.

---

# 22. Error Handling

The application handles several types of errors:

### Customer not found

```text
404 Customer not found
```

### Product not found

```text
404 Product not found
```

### Invalid quantity

```text
400 Invalid productId or quantity
```

### Insufficient stock

```text
400 Insufficient stock
```

### Worker processing failure

The worker:

1. Records the failure.
2. Increments retry count.
3. NACKs and requeues the message.
4. Attempts processing again.
5. Stops retrying after the configured retry limit.

---

# 23. Important Design Concepts Demonstrated

This project was specifically designed to understand the following backend concepts:

### Synchronous vs Asynchronous Processing

```text
REST API
   │
   ├── Synchronous:
   │      Validate + create order
   │
   └── Asynchronous:
          Payment
          Inventory
          Notification
```

### Decoupling

The order API does not directly execute all downstream operations.

Instead:

```text
Order Service
     ↓
RabbitMQ
     ↓
Independent Workers
```

This allows workers to evolve and scale independently.

### Event-Driven Architecture

The `order.created` event allows multiple consumers to react independently.

### Caching

Redis reduces repeated database reads for frequently requested products.

### Idempotency

Workers avoid processing the same order multiple times after successful completion.

### Retry Handling

Temporary failures can be retried without immediately losing the message.

### Distributed Locking

Redis locks help prevent concurrent processing of the same worker/order combination.



---



# 26. Learning Outcomes

By building this project, the following backend concepts are covered:

* LoopBack 3 architecture
* REST API design
* Models and relationships
* Boot scripts
* PostgreSQL integration
* Service layer
* Repository pattern
* Redis caching
* Redis TTL
* Redis distributed locking
* Worker state management
* RabbitMQ exchanges
* RabbitMQ routing keys
* Queues and consumers
* Message acknowledgement
* NACK and requeue
* Retry mechanisms
* Idempotent processing
* Event-driven architecture
* Asynchronous processing
* Node-RED application monitoring
* Integration of multiple backend infrastructure components

---



The primary objective is to understand how these components interact in an event-driven backend system and how asynchronous processing, caching, retries, idempotency and worker coordination can be implemented in a practical application.
