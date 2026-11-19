# SwiftDrop

Domain vocabulary for the SwiftDrop delivery management platform.

## Language

### COD & Settlements

**COD Amount**:
The exact cash amount to be collected from the recipient upon delivery for a Cash-on-Delivery order, excluding SwiftDrop's delivery fee.
_Avoid_: Total due, order price, shipping fee

**Delivery Fee**:
SwiftDrop's shipping charge for an order, deducted from the merchant's COD settlement payout on COD orders.
_Avoid_: Shipping cost, COD fee

**COD Collection**:
An operational cash-custody record created when a courier (at doorstep POD) or branch staff member (at branch handover) collects the full COD Amount.
_Avoid_: Payment, settlement

**Cash Handover**:
The physical transfer and branch-staff verification of collected COD cash from a courier to a branch.
_Avoid_: Deposit, payout

**COD Settlement**:
A verified batch payout from SwiftDrop to a merchant covering one or more handover-verified COD orders, equal to COD Amount minus Delivery Fee.
_Avoid_: Remittance, refund, cash handover

### Locations & Branch Coverage

**Administrative Division**:
A hierarchical Sri Lankan geographical unit in the order Province, District, Divisional Secretariat Division (DS Division), and Grama Niladhari Division (GN Division).
_Avoid_: Zone, region

**Postal Area**:
A canonical Sri Lankan postal delivery area identified by a unique 5-digit postal code and its official area name, linked to its administrative district and province.
_Avoid_: Zip code, service zone

**Branch Coverage**:
The exclusive set of active Postal Areas assigned to an operational SwiftDrop branch for pickup and destination routing; a Postal Area may be actively covered by at most one operational branch at a time.
_Avoid_: Radius zone, service area

### Branch Administration & Access

**Branch Manager**:
The single branch-level administrative user role (`BRANCH_MANAGER`) responsible for managing a SwiftDrop branch's operations; one Branch Manager account is provisioned per branch using the branch's email address.
_Avoid_: Branch Admin, Branch Supervisor

**Branch Staff**:
Operational personnel assigned to a specific SwiftDrop branch under a branch-scoped role (`DISPATCHER`, `COURIER`, or `BRANCH_STAFF`), managed within that branch's scope by its Branch Manager or Head Office Administration.
_Avoid_: Branch Admin, Global Staff
