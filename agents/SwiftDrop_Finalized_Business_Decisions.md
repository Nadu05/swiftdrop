# SwiftDrop – Finalized Business Decisions

**Document type:** Business Requirements and Implementation Decisions  
**Project:** SwiftDrop – Delivery Management Platform  
**Status:** Initial business decisions confirmed; some operational details remain unresolved.

---

## 1. Purpose

This document records the confirmed business rules for SwiftDrop before implementing the Order Service, Dispatch Service, and related integrations.

It establishes the agreed operational behavior and identifies outstanding decisions that may affect database design, API contracts, service responsibilities, and frontend workflows.

## 2. Confirmed Business Decisions

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

## 3. Detailed Business Rules

### 3.1 Payment Management

SwiftDrop will support two payment methods:

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

### 3.2 Delivery Pricing

The delivery fee will be calculated using three primary factors:

1. Distance between the relevant pickup and destination locations.
2. Parcel weight.
3. Parcel dimensions or size category.

The pricing engine should support configurable rates rather than hardcoding amounts into the application.

A quotation should contain:
- Calculated distance.
- Parcel weight and size.
- Base delivery charge, if applicable.
- Additional charges, if applicable.
- Final estimated delivery fee.

The backend Order Service must be authoritative for final quotation and order pricing.

### 3.3 Pickup Operations

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

### 3.4 Inter-Branch Transportation

Regular couriers will perform inter-branch transportation.

The system must support:
- Creating a transfer manifest.
- Assigning a regular courier to a transfer.
- Recording the parcels included in the manifest.
- Recording dispatch from the origin branch.
- Recording receipt at the destination branch.
- Maintaining custody and handover history.

A transfer operation must be distinguishable from a normal customer pickup or last-mile delivery assignment.

### 3.5 Delivery Attempts and Exceptions

The maximum permitted delivery attempts are three.

For each unsuccessful attempt, the courier must record:
- Attempt number.
- Failure reason.
- Attempt timestamp.
- Additional notes.
- Supporting evidence, where appropriate.

After three unsuccessful attempts, the parcel must be referred to the dispatcher.

The dispatcher decides the next action, such as:
- Initiating Return to Sender (RTS).
- Arranging another delivery under an approved exception.
- Contacting the customer or merchant.
- Taking another authorized operational action.

The system must record the dispatcher's decision, responsible user, timestamp, and reason.

### 3.6 Proof of Delivery

A successful delivery requires:
- Recipient name.
- Delivery timestamp.
- Courier identification.
- Signature or photo evidence.

The evidence must be associated with the relevant delivery task and parcel.

The system should maintain secure evidence access and prevent unauthorized modifications after delivery confirmation.

---

## 4. Recommended Parcel Lifecycle

The following is the proposed operational lifecycle based on the confirmed decisions.

1. Created
2. Confirmed
3. Pickup Assigned (when courier pickup is selected)
4. Picked Up (or received at branch for drop-off)
5. At Origin Branch
6. In Transit
7. At Destination Branch
8. Out for Delivery
9. Delivered

Exception and alternative states:
- Delivery Failed
- Pending Dispatcher Decision
- Return to Sender
- Returned to Sender
- Cancelled

The lifecycle should support branch drop-off without requiring a courier pickup assignment.

Internal operational events, such as courier assignment, branch receipt, transfer dispatch, and transfer handover, should be recorded separately from the main parcel status where appropriate.

---

## 5. Service Ownership Implications

| Service | Responsibilities |
|---|---|
| Identity Service | Users, authentication, roles, permissions and account management. |
| Organization Service | Branches, service areas, merchant applications, merchant approval and organizational data. |
| Order Service | Orders, parcels, pricing, payment references, tracking numbers and official parcel status history. |
| Dispatch Service | Pickup assignments, delivery tasks, courier assignments, delivery attempts, proof of delivery, exceptions and transfer manifests. |
| Notification Service | Payment notifications, assignment notifications, tracking updates, delivery notifications and merchant webhooks. |

Financial integrations may require additional payment-specific components, but payment ownership and settlement boundaries should be finalized before implementation.

---

## 6. Remaining Unresolved Business Decisions

The following decisions have not yet been confirmed.

### 6.1 Critical – Required Before Finalizing Relevant Backend Modules

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-01 | Which online payment gateway will be used? | Determines payment integration and transaction verification. |
| UD-02 | How will COD collections be settled with merchants? | Determines COD records, settlement calculations and merchant balances. |
| UD-03 | What is the exact pricing formula and rate structure? | Required to implement authoritative quotations. |
| UD-04 | Is signature mandatory, photo mandatory, or is either one sufficient? | Determines proof-of-delivery validation. |
| UD-05 | What happens if no branch covers the pickup or destination address? | Determines booking validation and service availability behavior. |
| UD-06 | How is the third failed attempt handled operationally while awaiting dispatcher review? | Determines parcel state, task closure and dispatcher workflow. |

### 6.2 Important – Required Before Completing Dispatch Operations

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-07 | Can couriers reject assignments? | Determines assignment acceptance workflow. |
| UD-08 | Can couriers handle pickup, inter-branch transfers and final delivery, or are some tasks restricted? | Determines courier eligibility and assignment rules. |
| UD-09 | Who can create and approve transfer manifests? | Defines branch and dispatcher permissions. |
| UD-10 | Is branch receipt confirmation mandatory for every transferred parcel? | Establishes custody controls. |
| UD-11 | Can a customer cancel after courier assignment or pickup? | Determines cancellation rules and refund handling. |
| UD-12 | Who pays additional charges for re-delivery or return transportation? | Affects pricing and exception handling. |

### 6.3 Important – Required Before Completing Payment and Merchant Modules

| ID | Outstanding decision | Why it matters |
|---|---|---|
| UD-13 | Is COD collected by the delivery courier, branch, or another authorized employee? | Determines collection responsibility. |
| UD-14 | When are COD amounts remitted to merchants? | Determines settlement cycles. |
| UD-15 | Can merchants maintain prepaid balances or credit accounts? | Affects merchant billing architecture. |
| UD-16 | Are merchants charged per parcel or through periodic invoices? | Determines billing model. |
| UD-17 | What business verification documents are required for merchant approval? | Determines merchant application fields and approval workflow. |

### 6.4 Additional Operational Decisions

| ID | Outstanding decision |
|---|---|
| UD-18 | What distance calculation method will be used: straight-line distance or road distance? |
| UD-19 | Are delivery rates configurable by branch, region or delivery zone? |
| UD-20 | Can dispatchers manually override automatically selected branches? |
| UD-21 | Are scheduled pickup and delivery time slots required? |
| UD-22 | Which notification channels are mandatory: email, SMS or in-app? |
| UD-23 | What parcel categories and prohibited-item rules apply? |
| UD-24 | What retention period applies to delivery photos, signatures and audit records? |

---

## 7. Technical Implementation Recommendations

The following technical rules should be incorporated into implementation:

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

## 8. Implementation Readiness

The confirmed decisions provide a sufficient foundation to begin designing the Order and Dispatch domains.

However, the unresolved decisions must be addressed before completing the affected functionality:

- Payment gateway and COD settlement before completing payment workflows.
- Pricing formula and rates before finalizing the quotation engine.
- Proof requirements before finalizing delivery confirmation validation.
- Branch coverage behavior before completing booking validation.
- Transfer permissions and courier eligibility before completing dispatch workflows.

**Final status:** Eight primary business decisions confirmed. Twenty-four additional business and operational questions identified for clarification.

This document should be updated whenever stakeholders approve or change a business rule.
