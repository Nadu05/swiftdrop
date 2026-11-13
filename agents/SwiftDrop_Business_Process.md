# SwiftDrop -- Complete Business Process and Operational Workflow

## 1. Purpose and Business Overview

SwiftDrop is a centralized parcel delivery and courier management
platform that connects customers, merchants, Head Office administrators,
branch offices, branch staff, dispatchers, and couriers.

The primary business objective is to manage a parcel from
delivery-request creation through pickup, branch processing,
transportation, final delivery, and delivery confirmation.

**Core business flow:**

Customer or merchant creates a delivery request → SwiftDrop validates
the request and calculates the charge → the system selects origin and
destination branches → a pickup courier collects the parcel → the origin
branch processes it → the parcel is transferred between branches when
necessary → the destination branch prepares it for delivery → a
last-mile courier delivers it → SwiftDrop records proof of delivery and
notifies relevant parties.

This document defines the recommended business workflow. Any optional
capabilities identified below must be confirmed against the
organization's actual operating policy before implementation.

------------------------------------------------------------------------

## 2. Business Participants and Responsibilities

### 2.1 Customer

A customer uses SwiftDrop to send personal parcels.

Responsibilities and capabilities:

-   Register and sign in, including Google authentication.
-   Create a delivery request.
-   Provide sender and recipient information.
-   Provide pickup and delivery addresses.
-   Enter parcel type, weight, dimensions or size, and handling
    instructions.
-   Review the estimated delivery fee.
-   Confirm a delivery request.
-   Track parcels using a tracking number.
-   View delivery history and receipts.
-   Receive delivery notifications.

### 2.2 Merchant

A merchant is a business partner that regularly sends parcels through
SwiftDrop.

Responsibilities and capabilities:

-   Register a business account and submit business information.
-   Wait for Head Office approval before using merchant delivery
    services.
-   Create individual or bulk delivery orders through the dashboard or
    API.
-   Prepare parcels for collection or branch drop-off.
-   Monitor order and delivery progress.
-   Manage API credentials, where API access is enabled.
-   Receive delivery updates and reports.
-   Review failed deliveries and request cancellations or other
    permitted actions.

### 2.3 Head Office Administrator

Head Office administrators manage the organization centrally.

Responsibilities and capabilities:

-   Create, update, deactivate, and manage branches.
-   Register and manage branch managers and employees.
-   Configure branch service areas and delivery zones.
-   Manage organization-wide users, roles, and permissions.
-   Review and approve or reject merchant registrations.
-   Configure delivery pricing and operational policies.
-   Monitor parcels and branch operations across the organization.
-   Review incidents and operational exceptions.
-   Generate organization-wide reports.

Head Office administrators have organization-wide access, subject to the
system's permission policy.

### 2.4 Branch Manager

A branch manager manages the operations of an assigned branch.

Responsibilities and capabilities:

-   Monitor branch parcel operations.
-   Manage branch staff, subject to assigned permissions.
-   Monitor pickup and delivery workloads.
-   Review parcel transfers and branch inventory/custody records.
-   Handle branch-level operational exceptions.
-   Monitor courier availability and performance.
-   Review branch reports.

A branch manager should normally be restricted to their assigned branch.

### 2.5 Branch Staff

Branch staff perform physical parcel-handling activities.

Responsibilities and capabilities:

-   Receive parcels from senders, couriers, and other branches.
-   Scan and verify parcels.
-   Record parcel arrival and departure.
-   Sort parcels according to destination.
-   Prepare parcels for branch transfers.
-   Receive and verify incoming transfer consignments.
-   Record discrepancies, damage, or missing parcels.
-   Prepare parcels for final delivery.

### 2.6 Dispatcher

A dispatcher coordinates courier assignments and delivery activities
within the authorized operational scope.

Responsibilities and capabilities:

-   View pending pickup and delivery tasks.
-   Review courier availability, workload, and service coverage.
-   Assign pickup couriers.
-   Assign last-mile delivery couriers.
-   Assign multiple parcels to a delivery run, where supported.
-   Reassign tasks when necessary.
-   Monitor active assignments.
-   Review failed pickup and delivery attempts.
-   Schedule retries or initiate return workflows according to policy.

### 2.7 Courier

A courier physically collects and delivers parcels.

Responsibilities and capabilities:

-   View assigned pickup and delivery tasks.
-   View the necessary sender, recipient, address, and parcel
    information.
-   Collect parcels and record pickup confirmation.
-   Hand parcels over to branches or authorized transfer personnel.
-   Deliver parcels to recipients.
-   Update task and parcel events.
-   Record failed attempts and reasons.
-   Capture proof of delivery where required.
-   Report parcel damage, loss, or other incidents.

------------------------------------------------------------------------

## 3. Organizational Structure

SwiftDrop operates through a central Head Office and multiple branch
offices.

``` text
                         HEAD OFFICE
                Central Organization Management
                             |
             +---------------+---------------+
             |               |               |
          Branch A        Branch B        Branch C
             |               |               |
        Branch Manager  Branch Manager  Branch Manager
             |               |               |
        Branch Staff    Branch Staff    Branch Staff
             |               |               |
        Dispatchers     Dispatchers     Dispatchers
             |               |               |
        Couriers        Couriers        Couriers
```

### 3.1 Head Office responsibilities

-   Maintain the organizational structure.
-   Create and manage branches.
-   Define service zones and operational coverage.
-   Manage organization-wide accounts and permissions.
-   Approve merchants.
-   Configure pricing and business policies.
-   Monitor organization-wide delivery operations.

### 3.2 Branch responsibilities

Each branch operates within its assigned service area.

-   Receive and process parcels.
-   Coordinate pickup and delivery activities.
-   Sort parcels according to destination.
-   Transfer parcels to other branches.
-   Manage local courier assignments.
-   Maintain parcel custody and movement records.
-   Handle branch-level exceptions.

**Access-control rule:** Head Office administrators can manage the whole
organization. Branch-level users should only access the branches and
operations authorized by their roles.

------------------------------------------------------------------------

## 4. End-to-End Parcel Delivery Workflow

### Step 1 -- Delivery Request Creation

SwiftDrop supports two primary request-creation channels.

#### A. Individual customer delivery

1.  The customer signs in.
2.  The customer selects **Create Delivery**.
3.  The customer enters sender information.
4.  The customer enters recipient information.
5.  The customer provides pickup and destination addresses.
6.  The customer enters parcel information, including type, weight,
    size/dimensions, and handling instructions.
7.  SwiftDrop calculates an estimated delivery fee.
8.  The customer reviews and confirms the request.

#### B. Merchant delivery

1.  The merchant registers a business account.
2.  The merchant submits the required business information.
3.  Head Office reviews the application.
4.  Head Office approves or rejects the application.
5.  An approved merchant receives access to the merchant dashboard and,
    if enabled, API credentials.
6.  The merchant creates individual or bulk delivery orders.
7.  SwiftDrop validates each order and registers accepted parcels.
8.  The merchant monitors the orders through the dashboard or API.

**Business rule:** A merchant must be approved and active before
creating delivery orders through merchant-only functionality.

### Step 2 -- Request Validation and Registration

SwiftDrop validates the submitted request before accepting it.

Validation may include:

-   Required sender and recipient information.
-   Valid contact details.
-   Pickup and destination addresses.
-   Parcel weight and dimension limits.
-   Supported parcel type.
-   Service availability at both locations.
-   Merchant account status and API authorization, where applicable.
-   Required handling or delivery information.

If validation fails, the system returns clear errors so the user can
correct the request.

If validation succeeds, the system:

1.  Registers the delivery request.
2.  Generates a unique tracking number.
3.  Stores the parcel details.
4.  Calculates or confirms the applicable delivery charge.
5.  Records the initial status and creation time.
6.  Initiates branch selection.
7.  Sends a request confirmation notification.

### Step 3 -- Automatic Branch Selection

SwiftDrop identifies the appropriate origin and destination branches.

-   **Origin branch:** Responsible for the pickup area and initial
    parcel processing.
-   **Destination branch:** Responsible for the recipient's area and
    final delivery processing.

Example:

``` text
Sender: Matara
       |
       v
Matara Branch (Origin)
       |
       | Inter-branch transportation
       v
Colombo Branch (Destination)
       |
       v
Recipient: Colombo
```

Branch selection should consider:

-   Geographical distance.
-   Branch service-zone coverage.
-   Branch operational status.
-   Service availability.
-   Any applicable routing or capacity rules.

The nearest branch should not be selected solely by straight-line
distance if it does not serve the location or cannot perform the
required operation.

The selected origin and destination branches should be associated with
the parcel. Changes to the routing decision should be controlled and
auditable.

### Step 4 -- Pickup Task Creation and Assignment

After branch selection, the origin branch receives a pickup task.

The dispatcher:

1.  Views pending pickup requests.
2.  Checks available couriers.
3.  Reviews courier workload and service coverage.
4.  Selects a suitable courier.
5.  Assigns the pickup task.
6.  Ensures the courier receives the task notification.

The courier should receive the information needed to complete the
pickup, such as:

-   Tracking number.
-   Sender name and contact details.
-   Pickup address.
-   Parcel information.
-   Pickup instructions.

### Step 5 -- Parcel Collection

The courier visits the sender's location.

The courier:

1.  Verifies the sender and parcel details.
2.  Checks whether the physical parcel matches the request.
3.  Collects the parcel.
4.  Scans the parcel barcode or QR code, if supported.
5.  Records the collection time.
6.  Confirms the pickup.
7.  Updates the relevant parcel/task event.
8.  Provides collection confirmation where required.

If collection is unsuccessful, the courier records a reason, such as:

-   Sender unavailable.
-   Incorrect pickup address.
-   Parcel not ready.
-   Sender cancellation.
-   Other operational issue.

A failed pickup must be distinguished from a failed final delivery.

### Step 6 -- Origin Branch Processing

The courier hands the collected parcel to the origin branch.

Branch staff:

1.  Receive the parcel physically.
2.  Scan its tracking number.
3.  Verify parcel information.
4.  Confirm receipt at the branch.
5.  Record the receiving employee and timestamp.
6.  Place the parcel in the appropriate sorting area.
7.  Confirm the destination branch.
8.  Prepare the parcel for local processing or inter-branch transfer.

This stage establishes a clear record that the branch has taken custody
of the parcel.

### Step 7 -- Inter-Branch Transportation

If the destination branch differs from the origin branch, the parcel
must be transferred.

The process is:

1.  Origin branch groups parcels according to destination.
2.  Staff prepare a transfer manifest.
3.  Parcels are associated with the transfer reference.
4.  Parcels are handed to an authorized vehicle, courier, or transfer
    team.
5.  The origin branch records dispatch.
6.  The receiving branch receives the transfer.
7.  Staff scan and verify each parcel.
8.  The destination branch records receipt and discrepancies.
9.  The transfer is marked completed when the receiving process is
    finalized.

A transfer record should include:

-   Transfer reference.
-   Origin branch.
-   Destination branch.
-   Parcel IDs included in the transfer.
-   Dispatch date and time.
-   Receiving date and time.
-   Responsible dispatching and receiving employees.
-   Transfer status.
-   Notes and discrepancy records, where applicable.

**Important rule:** Do not update a parcel's branch association without
maintaining its movement history. Every physical handover must be
traceable.

### Step 8 -- Destination Branch Processing

After the parcel arrives at the destination branch:

1.  Branch staff scan the parcel.
2.  The system verifies the expected destination branch.
3.  Staff confirm physical receipt.
4.  The parcel is placed in the outgoing delivery section.
5.  The dispatcher views parcels ready for final delivery.
6.  The branch prepares courier assignments.

### Step 9 -- Last-Mile Courier Assignment

The destination branch dispatcher assigns a suitable courier.

Assignment considerations include:

-   Recipient location.
-   Courier service area.
-   Courier availability.
-   Current workload.
-   Delivery priority.
-   Parcel handling requirements.

The dispatcher may:

-   Assign one parcel.
-   Assign multiple parcels to a delivery run.
-   Reassign a parcel when necessary.
-   Monitor active assignments.
-   Review courier workload and progress.

### Step 10 -- Final Delivery

The courier travels to the recipient's address.

The courier:

1.  Checks parcel and recipient information.
2.  Contacts the recipient if necessary.
3.  Verifies the recipient or authorized receiving person according to
    company policy.
4.  Hands over the parcel.
5.  Captures the required proof of delivery.
6.  Records the delivery timestamp.
7.  Updates the parcel to the delivered state.

Possible proof-of-delivery information includes:

-   Recipient name.
-   Recipient signature.
-   Delivery timestamp.
-   Photograph, where appropriate and consented to.
-   Delivery confirmation code or OTP, if implemented.

### Step 11 -- Delivery Completion

After successful delivery, SwiftDrop:

-   Records the final delivery status.
-   Stores proof of delivery.
-   Records the responsible courier.
-   Saves the delivery event in parcel history.
-   Notifies the sender and recipient.
-   Updates the merchant order, where applicable.
-   Makes the completed delivery available in tracking and reports.

------------------------------------------------------------------------

## 5. Parcel Status and Event Management

The parcel's public delivery status and internal operational events
should be designed separately.

### 5.1 Confirmed Principal Parcel Statuses

| Status | Meaning |
|---|---|
| **Created** | Delivery request has been registered. |
| **Confirmed** | Request has passed validation and is accepted. |
| **Pickup Assigned** | A courier has been assigned to collect the parcel (when courier pickup is selected). |
| **Picked Up** | Courier has collected the parcel (or received at branch for drop-off). |
| **At Origin Branch** | Origin branch has received the parcel. |
| **In Transit** | Parcel is being transported between branches. |
| **At Destination Branch** | Destination branch has received the parcel. |
| **Out for Delivery** | Last-mile courier is carrying out delivery. |
| **Delivered** | Parcel has been successfully handed over. |
| **Delivery Failed** | A delivery attempt was unsuccessful. |
| **Pending Dispatcher Decision** | Maximum delivery attempts (3) reached; awaiting dispatcher review and action. |
| **Return to Sender** | Return process has been initiated by the dispatcher. |
| **Returned to Sender** | Parcel has completed the return process. |
| **Cancelled** | Delivery request has been cancelled under the applicable policy. |

The lifecycle supports branch drop-off without requiring a courier pickup assignment.

### 5.2 Internal operational events

Not every operational event needs to become a public parcel status.

Examples of internal events include:

-   Pickup task assigned.
-   Pickup attempt started.
-   Pickup attempt failed.
-   Parcel scanned at branch.
-   Transfer manifest created.
-   Transfer dispatched.
-   Transfer received.
-   Parcel sorted.
-   Last-mile task assigned.
-   Delivery attempt failed.
-   Return authorized.
-   Parcel marked damaged.

### 5.3 Status and event rules

Every important status change or operational event should record:

-   Parcel ID.
-   Event or status type.
-   Timestamp.
-   Responsible user or system actor.
-   Related branch or location.
-   Notes or failure reason, where applicable.
-   Supporting evidence, where applicable.

Status transitions must be validated. For example, a parcel should not
move directly from Created to Delivered without completing the required
operational steps.

The public tracking page can present simplified descriptions while the
internal system maintains detailed operational history.

------------------------------------------------------------------------

## 6. Failed Operations and Exception Handling

### 6.1 Failed pickup

Example: The sender is unavailable.

1.  Courier records the failed pickup reason.
2.  System records the attempt and timestamp.
3.  Sender receives an update.
4.  Dispatcher reviews the task.
5.  Dispatcher schedules another attempt or cancels the request
    according to policy.

### 6.2 Failed final delivery

Example: Recipient is unavailable.

1.  Courier records the failed delivery reason.
2.  Courier records the attempt time.
3.  Parcel remains under the custody of the courier or branch, as
    applicable.
4.  Dispatcher reviews the failure.
5.  Dispatcher schedules another attempt or initiates a return according
    to policy.
6.  Sender and merchant receive an update.

### 6.3 Damaged parcel

1.  Staff or courier reports the damage.
2.  System records the incident.
3.  Supporting photographs or evidence may be uploaded.
4.  Parcel is flagged for investigation.
5.  Authorized management reviews the incident.
6.  The decision and final resolution are recorded.

### 6.4 Lost or missing parcel

1.  An employee reports the missing parcel.
2.  System creates an incident record.
3.  Authorized staff review the last known scan, custody, and transfer
    history.
4.  The responsible operational team investigates.
5.  Management records the resolution and any required corrective
    action.

### 6.5 Return to sender

1.  Dispatcher or authorized manager initiates or approves the return
    according to policy.
2.  System records the return reason.
3.  Parcel is routed through the required branch network.
4.  Every branch records receipt and dispatch.
5.  Origin branch receives the returned parcel.
6.  Sender is notified.
7.  Return completion is recorded in the parcel history.

------------------------------------------------------------------------

## 7. Merchant Business Workflow

Merchants are business partners rather than ordinary individual
customers.

### 7.1 Merchant onboarding

1.  Merchant submits a registration application.
2.  Merchant provides business details and required supporting
    information.
3.  Head Office reviews the application.
4.  Head Office approves or rejects it.
5.  The system notifies the merchant of the decision.
6.  Approved merchants receive dashboard access.
7.  API credentials are issued if API integration is enabled.

### 7.2 Merchant order processing

1.  Merchant signs in or authenticates through the approved API.
2.  Merchant creates individual or bulk orders.
3.  SwiftDrop validates the orders.
4.  Valid orders receive tracking numbers.
5.  SwiftDrop selects origin and destination branches.
6.  Merchant prepares parcels for pickup or branch drop-off.
7.  SwiftDrop performs the normal pickup, branch, transfer, and delivery
    workflow.
8.  Merchant monitors delivery progress.
9.  Merchant receives completion or exception updates.

### 7.3 Recommended merchant capabilities

-   Individual order creation.
-   Bulk order upload.
-   API-based order creation.
-   API key management.
-   Delivery status webhooks.
-   Order cancellation requests.
-   Failed delivery reports.
-   Monthly delivery reports.
-   Delivery charge summaries.
-   COD management, if supported by the business model.

### 7.4 Merchant parcel handover models

**Model A -- Courier pickup**

SwiftDrop assigns a courier to collect prepared parcels from the
merchant's warehouse or business location.

**Model B -- Branch drop-off**

The merchant transports prepared parcels to a designated SwiftDrop
branch. Branch staff verify and register physical receipt.

The organization should decide whether both models are supported and
define their operational rules.

------------------------------------------------------------------------

## 8. Payment and Financial Workflow

The organization must define its pricing and payment policy. Possible
models include:

  -----------------------------------------------------------------------
  Payment model                       Business operation
  ----------------------------------- -----------------------------------
  Prepaid                             Customer pays when creating the
                                      delivery request.

  Cash on Delivery (COD)              Recipient pays the specified amount
                                      when receiving the parcel.

  Merchant billing                    Merchant receives a periodic
                                      consolidated invoice.

  Branch cash collection              Branch staff record an authorized
                                      cash payment.
  -----------------------------------------------------------------------

### 8.1 Suggested COD workflow

1.  Merchant creates a COD order.
2.  COD amount is stored against the parcel.
3.  Courier delivers the parcel.
4.  Courier collects the amount from the recipient.
5.  Courier records the collected amount.
6.  Branch verifies the cash handover.
7.  Finance reconciles the collection.
8.  Merchant receives the agreed settlement.

COD must be tracked separately from the normal delivery fee. It requires
collection records, reconciliation, and settlement tracking.

**Scope note:** COD, merchant billing, online payments, and settlement
are optional business capabilities until confirmed by the organization.

------------------------------------------------------------------------

## 9. Notification Workflow

Notifications should be triggered by important business events.

  Event                       Intended recipient
  --------------------------- ---------------------------------------------------
  Delivery request created    Customer or merchant
  Pickup assigned             Courier
  Parcel picked up            Sender and merchant, where applicable
  Parcel received at branch   Sender and merchant, where applicable
  Parcel transferred          Sender and merchant, where applicable
  Out for delivery            Recipient and sender
  Delivered                   Sender, recipient, and merchant, where applicable
  Delivery failed             Sender and merchant, where applicable
  Merchant approved           Merchant
  Merchant rejected           Merchant
  Return initiated            Sender and merchant, where applicable

Possible communication channels:

-   Email.
-   SMS.
-   In-app notifications.
-   Merchant webhooks.

Notification preferences, message templates, retry policies, and
delivery logs should be managed centrally.

------------------------------------------------------------------------

## 10. Role and Permission Matrix

  -----------------------------------------------------------------------
  Role                                Main permissions
  ----------------------------------- -----------------------------------
  Head Office Administrator           Organization-wide administration,
                                      branches, users, merchants,
                                      policies, and reports.

  Branch Manager                      Management of the assigned branch
                                      and its operations.

  Branch Staff                        Authorized parcel receiving,
                                      scanning, sorting, and transfer
                                      operations.

  Dispatcher                          Courier assignment and delivery
                                      monitoring within the authorized
                                      branch or scope.

  Courier                             View and update assigned pickup and
                                      delivery tasks.

  Merchant                            Manage business orders and monitor
                                      associated parcels.

  Customer                            Manage personal delivery requests
                                      and track personal parcels.
  -----------------------------------------------------------------------

Permissions should be enforced by the backend, not only hidden in the
frontend. Branch-level users must not access another branch's
operational data unless explicitly authorized.

------------------------------------------------------------------------

## 11. Mapping Business Responsibilities to Microservices

SwiftDrop uses a microservices architecture with independent data
ownership.

  -----------------------------------------------------------------------
  Microservice                        Primary business responsibility
  ----------------------------------- -----------------------------------
  Identity Service                    Authentication, user accounts,
                                      roles, and permissions.

  Organization Service                Head Office structure, branches,
                                      employees, merchants, and service
                                      zones.

  Order Service                       Delivery requests, parcel details,
                                      tracking, and official parcel
                                      status history.

  Dispatch Service                    Pickup assignments, courier
                                      assignments, delivery tasks,
                                      workload, transfer operations, and
                                      proof-of-delivery records.

  Notification Service                Email, SMS, in-app notifications,
                                      and merchant webhooks.

  API Gateway                         Centralized API routing and shared
                                      gateway policies.
  -----------------------------------------------------------------------

### 11.1 Service ownership principles

-   Identity Service owns identity and authorization data.
-   Organization Service owns branch, merchant, and organizational data.
-   Order Service owns the official parcel lifecycle and parcel status
    history.
-   Dispatch Service owns operational assignments and courier tasks.
-   Notification Service owns notification and webhook delivery records.
-   Services communicate through defined REST APIs and asynchronous
    events.
-   A service must not directly modify another service's database.
-   Cross-service references should use identifiers and service
    contracts rather than cross-database foreign keys.

**Important design distinction:**

1.  **Parcel movement:** Where the physical parcel is and which branch
    or person has custody.
2.  **Delivery assignment:** Which courier or team is responsible for
    the next operational task.
3.  **Parcel status:** What stage the overall delivery has reached.

These concepts are related but must not be treated as interchangeable.
Order Service should own the official parcel lifecycle, while Dispatch
Service owns operational assignments and tasks. Changes should be
coordinated through explicit APIs or events.

------------------------------------------------------------------------

## 12. Overall Business Process Diagram

``` mermaid
flowchart TD
    A["Customer / Merchant"] --> B["Create Delivery Request"]
    B --> C["Validate Request and Calculate Fee"]
    C --> D{"Request Valid?"}
    D -->|No| E["Return Validation Errors"]
    E --> B
    D -->|Yes| F["Generate Tracking Number"]
    F --> G["Select Origin and Destination Branches"]
    G --> H["Origin Branch Dispatcher"]
    H --> I["Assign Pickup Courier"]
    I --> J["Collect Parcel"]
    J --> K{"Pickup Successful?"}
    K -->|No| L["Record Failed Pickup"]
    L --> H
    K -->|Yes| M["Origin Branch Receives Parcel"]
    M --> N["Scan, Verify and Sort"]
    N --> O{"Different Destination Branch?"}
    O -->|Yes| P["Prepare Transfer Manifest"]
    P --> Q["Inter-Branch Transportation"]
    Q --> R["Destination Branch Receives Parcel"]
    O -->|No| R
    R --> S["Assign Last-Mile Courier"]
    S --> T["Out for Delivery"]
    T --> U{"Delivered?"}
    U -->|Yes| V["Record Proof of Delivery"]
    V --> W["Mark Delivered"]
    W --> X["Notify Customer / Merchant"]
    U -->|No| Y["Record Failure Reason"]
    Y --> Z{"Retry or Return?"}
    Z -->|Retry| S
    Z -->|Return| AA["Return-to-Sender Process"]
```

------------------------------------------------------------------------

## 13. Recommended Business Modules

The overall SwiftDrop platform can be organized into six major modules.

### 13.1 Organization Management

-   Head Office management.
-   Branch management.
-   Employee and user management.
-   Merchant registration and approval.
-   Service zones and branch coverage.
-   Role and permission management.

### 13.2 Delivery Management

-   Customer delivery requests.
-   Merchant delivery orders.
-   Parcel registration.
-   Delivery pricing.
-   Tracking number generation.
-   Parcel lifecycle and tracking history.

### 13.3 Branch Operations

-   Parcel receiving.
-   Parcel scanning and verification.
-   Parcel sorting.
-   Branch transfers.
-   Transfer manifests.
-   Parcel custody and movement history.

### 13.4 Courier Management

-   Courier profiles and availability.
-   Pickup assignments.
-   Last-mile assignments.
-   Delivery runs.
-   Workload management.
-   Proof of delivery.
-   Failed pickup and delivery handling.

### 13.5 Financial Management

-   Delivery charges.
-   Payment records.
-   COD collection.
-   Merchant billing.
-   Cash reconciliation.
-   Merchant settlement.

### 13.6 Communication and Monitoring

-   Customer notifications.
-   Merchant notifications.
-   Courier notifications.
-   Webhooks.
-   Operational dashboards.
-   Branch and courier reports.
-   Audit logs and incident monitoring.

------------------------------------------------------------------------

## 14. Finalized Business Decisions and Operational Rules

**Status:** Initial business decisions confirmed; some operational details remain unresolved before completing affected modules.

### 14.1 Confirmed Business Decisions

| ID | Business area | Confirmed decision |
|---|---|---|
| BD-01 | Payment model | Both prepaid and Cash on Delivery (COD) are supported. |
| BD-02 | Delivery retry limit | A maximum of three delivery attempts is permitted. |
| BD-03 | Inter-branch transportation | Regular couriers handle inter-branch parcel transportation. |
| BD-04 | Customer pickup methods | Customers can request courier pickup or drop off parcels at a branch. |
| BD-05 | Merchant pickup methods | Merchants can request courier collection or drop off parcels at a branch. |
| BD-06 | Delivery pricing | Pricing considers distance, parcel weight, and parcel size. |
| BD-07 | Failed delivery after maximum attempts | The dispatcher makes the decision after three unsuccessful attempts. |
| BD-08 | Delivery proof | Delivery confirmation records the recipient's name and signature or photo evidence. |

### 14.2 Detailed Business Rules

#### Payment Management
SwiftDrop supports two payment methods:
- **Prepaid:** The customer pays the delivery fee before the delivery process proceeds.
- **Cash on Delivery (COD):** The recipient pays the applicable amount when the parcel is delivered.

The system must distinguish delivery fees from the merchant's COD collection amount. These may be different financial values.

Payment records should support:
- Payment method and amount.
- Payment status.
- Transaction reference.
- Payment timestamp.
- Associated order and payer.
- COD collection and settlement records.

The exact payment gateway and COD settlement process remain to be confirmed.

#### Delivery Pricing
The delivery fee is calculated using three primary factors:
1. Distance between the relevant pickup and destination locations.
2. Parcel weight.
3. Parcel dimensions or size category.

The pricing engine must support configurable rates rather than hardcoding amounts into the application.

A quotation must contain:
- Calculated distance.
- Parcel weight and size.
- Base delivery charge, if applicable.
- Additional charges, if applicable.
- Final estimated delivery fee.

The backend Order Service must be authoritative for final quotation and order pricing.

#### Pickup Operations
Both customers and merchants can choose between:

**Option A – Courier pickup**
- A pickup request is created.
- A dispatcher or dispatch rule assigns an available courier.
- The courier collects the parcel.
- Collection is recorded with the relevant timestamp and evidence.

**Option B – Branch drop-off**
- The customer or merchant takes the parcel to the designated branch.
- Branch personnel verify and receive the parcel.
- Parcel custody is recorded.
- The parcel enters the branch processing workflow.

#### Inter-Branch Transportation
Regular couriers perform inter-branch transportation.

The system must support:
- Creating a transfer manifest.
- Assigning a regular courier to a transfer.
- Recording the parcels included in the manifest.
- Recording dispatch from the origin branch.
- Recording receipt at the destination branch.
- Maintaining custody and handover history.

A transfer operation must be distinguishable from a normal customer pickup or last-mile delivery assignment.

#### Delivery Attempts and Exceptions
The maximum permitted delivery attempts are three.

For each unsuccessful attempt, the courier must record:
- Attempt number.
- Failure reason.
- Attempt timestamp.
- Additional notes.
- Supporting evidence, where appropriate.

After three unsuccessful attempts, the parcel must be referred to the dispatcher (`Pending Dispatcher Decision`).

The dispatcher decides the next action, such as:
- Initiating Return to Sender (RTS).
- Arranging another delivery under an approved exception.
- Contacting the customer or merchant.
- Taking another authorized operational action.

The system must record the dispatcher's decision, responsible user, timestamp, and reason.

#### Proof of Delivery
A successful delivery requires:
- Recipient name.
- Delivery timestamp.
- Courier identification.
- Signature or photo evidence.

The evidence must be associated with the relevant delivery task and parcel. The system must maintain secure evidence access and prevent unauthorized modifications after delivery confirmation.

### 14.3 Service Ownership Implications

| Service | Responsibilities |
|---|---|
| Identity Service | Users, authentication, roles, permissions and account management. |
| Organization Service | Branches, service areas, merchant applications, merchant approval and organizational data. |
| Order Service | Orders, parcels, pricing, payment references, tracking numbers and official parcel status history. |
| Dispatch Service | Pickup assignments, delivery tasks, courier assignments, delivery attempts, proof of delivery, exceptions and transfer manifests. |
| Notification Service | Payment notifications, assignment notifications, tracking updates, delivery notifications and merchant webhooks. |

Financial integrations may require additional payment-specific components, but payment ownership and settlement boundaries should be finalized before implementation.

### 14.4 Remaining Unresolved Business Decisions

#### Critical – Required Before Finalizing Relevant Backend Modules

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-01 | Which online payment gateway will be used? | Determines payment integration and transaction verification. |
| UD-02 | How will COD collections be settled with merchants? | Determines COD records, settlement calculations and merchant balances. |
| UD-03 | What is the exact pricing formula and rate structure? | Required to implement authoritative quotations. |
| UD-04 | Is signature mandatory, photo mandatory, or is either one sufficient? | Determines proof-of-delivery validation. |
| UD-05 | What happens if no branch covers the pickup or destination address? | Determines booking validation and service availability behavior. |
| UD-06 | How is the third failed attempt handled operationally while awaiting dispatcher review? | Determines parcel state, task closure and dispatcher workflow. |

#### Important – Required Before Completing Dispatch Operations

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-07 | Can couriers reject assignments? | Determines assignment acceptance workflow. |
| UD-08 | Can couriers handle pickup, inter-branch transfers and final delivery, or are some tasks restricted? | Determines courier eligibility and assignment rules. |
| UD-09 | Who can create and approve transfer manifests? | Defines branch and dispatcher permissions. |
| UD-10 | Is branch receipt confirmation mandatory for every transferred parcel? | Establishes custody controls. |
| UD-11 | Can a customer cancel after courier assignment or pickup? | Determines cancellation rules and refund handling. |
| UD-12 | Who pays additional charges for re-delivery or return transportation? | Affects pricing and exception handling. |

#### Important – Required Before Completing Payment and Merchant Modules

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-13 | Is COD collected by the delivery courier, branch, or another authorized employee? | Determines collection responsibility. |
| UD-14 | When are COD amounts remitted to merchants? | Determines settlement cycles. |
| UD-15 | Can merchants maintain prepaid balances or credit accounts? | Affects merchant billing architecture. |
| UD-16 | Are merchants charged per parcel or through periodic invoices? | Determines billing model. |
| UD-17 | What business verification documents are required for merchant approval? | Determines merchant application fields and approval workflow. |

#### Additional Operational Decisions

| ID | Outstanding decision |
|---|---|
| UD-18 | What distance calculation method will be used: straight-line distance or road distance? |
| UD-19 | Are delivery rates configurable by branch, region or delivery zone? |
| UD-20 | Can dispatchers manually override automatically selected branches? |
| UD-21 | Are scheduled pickup and delivery time slots required? |
| UD-22 | Which notification channels are mandatory: email, SMS or in-app? |
| UD-23 | What parcel categories and prohibited-item rules apply? |
| UD-24 | What retention period applies to delivery photos, signatures and audit records? |

### 14.5 Technical Implementation Recommendations

1. Use configurable pricing rules and store the quoted price against the order.
2. Revalidate payment status on the backend before allowing prepaid orders to proceed.
3. Keep COD collection amount separate from delivery charges.
4. Use a separate delivery-attempt record instead of storing only an attempt counter.
5. Maintain immutable tracking and custody history.
6. Model transfer manifests as first-class Dispatch Service entities.
7. Make courier assignments and event consumers idempotent.
8. Use RabbitMQ domain events to communicate order creation, pickup assignment, branch receipt, transfer completion, delivery completion and exception decisions.
9. Keep proof-of-delivery evidence securely stored and referenced from the Dispatch Service.
10. Record dispatcher decisions with user identity, timestamp and reason.

### 14.6 Implementation Readiness

The confirmed decisions provide a sufficient foundation to begin designing the Order and Dispatch domains. However, the unresolved decisions must be addressed before completing the affected functionality:
- Payment gateway and COD settlement before completing payment workflows.
- Pricing formula and rates before finalizing the quotation engine.
- Proof requirements before finalizing delivery confirmation validation.
- Branch coverage behavior before completing booking validation.
- Transfer permissions and courier eligibility before completing dispatch workflows.

**Final status:** Eight primary business decisions confirmed. Twenty-four additional business and operational questions identified for clarification.

------------------------------------------------------------------------

## 15. Core Principles for Correct Implementation

To ensure that the software reflects the actual business operation:

-   Maintain a traceable record of every physical parcel handover.
-   Separate pickup tasks from last-mile delivery tasks.
-   Separate parcel movement from parcel status and courier assignment.
-   Validate all status transitions on the backend.
-   Record who performed each important operation and when.
-   Preserve parcel transfer history.
-   Restrict branch-level access to authorized branches.
-   Require merchant approval before enabling merchant order creation.
-   Keep COD and delivery charges as separate financial concepts if COD
    is supported.
-   Make failed operations first-class workflows rather than simple
    error messages.
-   Use explicit service ownership and inter-service contracts.
-   Ensure customer and merchant tracking reflects verified operational
    events.

## Conclusion

SwiftDrop is not simply a parcel tracking application. It is an
end-to-end delivery operations platform that coordinates organizational
management, parcel registration, geographical branch routing, pickup,
branch processing, inter-branch transportation, courier assignment,
final delivery, financial operations, notifications, and exception
handling.

The business process must remain consistent across the frontend, backend
microservices, database ownership, APIs, and operational
responsibilities.
