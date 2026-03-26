# NTSsign SaaS Overview

## What NTSsign is

NTSsign is a SaaS platform for creating, managing, sending, and tracking business documents such as contracts and similar agreement workflows.

The current product is focused on:

- document generation from internal forms
- PandaDoc-based sending and signing
- signed PDF access
- customer/workspace management
- profile and company data management
- master-level administration

## Main modules

### Login

- branded login page
- create-account request flow
- input validation
- account-request storage for later review by master users

### Documents

- document listing
- filters, search, pagination, sort
- document creation wizard
- send for signature
- sync status
- final PDF view and download

### Profile

- company details
- insurance details
- primary contact
- editable profile cards
- collapsible sections
- company logo upload

### Users

Available for master users.

- user management
- create user
- edit user
- deactivate/reactivate user
- account request review

### Billing

- usage summary
- plan visibility
- workspace usage tracking

## Current document creation flow

### 1. Setup

The user starts a new document and sees:

- document type
- contract date
- form
- template

These values are currently visible but locked in the UI.

### 2. Client

The client tab captures:

- customer name
- age
- email
- phone
- fax
- address
- city
- state
- zip code

Current validation includes:

- required fields
- email format
- age minimum rule
- field-level inline errors

### 3. Project

The project tab captures:

- same as client address checkbox
- project address
- city
- state
- zip code
- start date
- estimated completion date
- project description
- internal notes

Current validation includes:

- project address requirement when not inherited from client
- city/state/zip requirement when not inherited from client
- start date required
- no past start dates
- estimated completion date cannot be earlier than start date

### 4. Pricing

The pricing tab captures:

- contract price
- down payment
- finance charge
- finance schedule rows
- payment schedule

Current validation includes:

- contract price required

### 5. Others

The others tab captures:

- salesman full name
- state registration number
- warranty years

## Roles

### Master

Master users can:

- manage workspace users
- review account requests
- view workspace-wide documents
- access broader administrative actions

### User

Standard users can:

- manage their own document flow
- update profile/workspace information
- work within the assigned workspace

## Current document lifecycle

The current workflow supports:

- draft creation
- send to PandaDoc
- status sync
- signed/final PDF access

Statuses currently used include:

- DRAFT
- SENT
- VIEWED
- SIGNED
- COMPLETED
- CANCELLED

## PandaDoc integration

The current implementation supports:

- template-based document creation
- send to recipient
- status synchronization
- final PDF retrieval

For local development:

- automatic status changes do not happen unless a manual sync is used
- this is because local webhook delivery is not public by default

For staging:

- webhook-based automatic updates are expected

## Account request flow

The current login page includes a create-account request flow.

Captured fields:

- full name
- email
- confirm email
- requested document types

The request is stored in the database and can later be reviewed by master users.

## Product strengths today

- polished login experience
- guided document creation
- role-based behavior
- signed PDF preview/download
- usable staging environment
- customer-ready demo flow

## Planned improvements

- production deployment
- stronger pricing and billing enforcement
- more template and document-type support
- deeper white-labeling
- embedded signing options
- richer document analytics

## Operational guidance

- continue building in local first
- validate integrations in staging
- push to production only after pricing, workflow, and support model are stable
