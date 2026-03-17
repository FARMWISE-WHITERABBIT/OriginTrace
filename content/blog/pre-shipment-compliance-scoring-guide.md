---
title: "Pre-Shipment Compliance Scoring: How to Stop Rejections Before They Happen"
description: "Shipment rejections cost African exporters hundreds of thousands of dollars per incident. Pre-shipment compliance scoring catches the issues that cause rejections — before cargo reaches port."
date: "2026-03-18"
category: "Best Practices"
author: "OriginTrace Compliance Team"
authorTitle: "Export Operations"
coverGradient: "from-violet-100 to-slate-100 dark:from-violet-900/30 dark:to-slate-800/50"
---

## The Economics of a Rejected Shipment

A single rejected shipment costs more than the cargo value. The direct losses include freight, demurrage, re-inspection fees, fumigation costs, potential destruction orders, and the cost of a replacement shipment to cover the buyer's purchase contract. The indirect losses — damage to the buyer relationship, removal from approved supplier lists, reputational harm in small commodity trading networks — compound over months.

Across African agricultural exports, shipment rejection rates at major destination ports have been reported between 8% and 15% for certain commodities and corridors. At an average shipment value of $500,000, that is $40,000–$75,000 in expected losses per 100 shipments — before the relationship damage is counted.

Most of these rejections are preventable. The root causes are almost always detectable before the cargo leaves the country of origin: missing or expired documentation, farm polygons that fail deforestation checks, MRL violations in lab results, or batches where traceability chain is broken. The information exists. The problem is that it is not being evaluated systematically before the shipment is released.

---

## What Pre-Shipment Scoring Is

Pre-shipment compliance scoring is a structured evaluation of a shipment against the regulatory requirements of its target market, conducted before the cargo is loaded. It is distinct from:

- **Post-shipment inspection** — what happens at the destination port, after you have lost control
- **Pre-export certification** — phytosanitary and quality certificates issued by the national authority, which are necessary but not sufficient
- **Buyer-specific quality checks** — the buyer's internal standards, which vary and are not a substitute for regulatory compliance

Pre-shipment scoring evaluates the shipment across the specific regulatory dimensions that determine whether it will be accepted or rejected at the destination. For a cocoa shipment to Germany, those dimensions include EUDR traceability and deforestation status, EU Contaminants Regulation limits for ochratoxin A and cadmium, phytosanitary certification, and documentation completeness for TRACES submission. For a ginger shipment to China, the dimensions include GACC registration status, pesticide MRL compliance, GB labelling requirements, and GACC traceability documentation.

A score below the threshold on any of these dimensions means the shipment should not leave the warehouse until the issue is resolved.

---

## The Five Compliance Dimensions

Effective pre-shipment scoring evaluates five distinct dimensions. Each can be the cause of a rejection independently — you cannot compensate for a failing score on one dimension with a perfect score on another.

**1. Farm Eligibility** — are all the source farms in this shipment compliant? This means: are they registered and approved in your supplier database, do they have valid GPS polygon data, and do those polygons pass deforestation checks for EUDR-covered markets? A single ineligible farm in the batch is sufficient for an EUDR rejection.

**2. Supply Chain Integrity** — is the chain of custody from farm to shipment intact and documented? This means: is there an unbroken record linking this shipment to its constituent batches, and those batches to their source farms? Gaps in the chain — batches with missing farmer attribution, bags without traceability links — are flags for both regulatory submissions and buyer due diligence.

**3. Contaminant and Quality Compliance** — do the available lab results for this batch fall within the MRL and contaminant limits for the target market? For EU markets this means ochratoxin A (cocoa), cadmium (cocoa), aflatoxin B1 (multiple commodities), and pesticide MRL compliance. A shipment without valid, in-date lab results for the relevant parameters should not score as compliant.

**4. Documentation Completeness** — are all required documents present, valid, and in-date? This includes the phytosanitary certificate, fumigation certificate, certificate of origin, bill of lading, and any market-specific documents such as a DDS reference for EU, an NOC for UAE markets, or a GACC declaration for China. Expiry dates matter — a phytosanitary certificate issued more than 21 days before arrival at EU ports is not valid.

**5. Regulatory Framework Alignment** — is the shipment structured to meet the specific submission requirements of the target regulatory system? For EUDR this means a submitted DDS reference number. For FSMA 204 in the US it means a FSMA Food Traceability List record with all required Key Data Elements. For GACC it means the facility registration number on all documentation. These are administrative but they are also rejection-triggering.

---

## What a Go / Conditional / No-Go Decision Actually Means

A three-tier readiness decision — Go, Conditional, No-Go — is the clearest output for an operational pre-shipment check.

**Go** means all five dimensions score within acceptable thresholds for the target market. The shipment is cleared for release. Documentation is complete, farm eligibility is verified, lab results are within limits, and regulatory submission requirements are met.

**Conditional** means one or more dimensions have flags that can be resolved before departure. Examples: lab results pending but previous lot results from the same source farms are available; one farm polygon has a low confidence score but deforestation check is clean; phytosanitary certificate is in process. Conditional shipments can proceed but require a defined resolution action and a follow-up check before loading.

**No-Go** means one or more dimensions have hard failures that cannot be resolved without removing or replacing part of the cargo, obtaining missing documentation, or resolving a compliance issue at source. Examples: one batch within the shipment contains cocoa from a deforested farm; lab result shows an MRL violation; facility registration has expired; phytosanitary certificate cannot be obtained in the available time window.

No-Go is not a failure of the scoring system. It is the scoring system working correctly. The cost of resolving a No-Go before the cargo leaves the warehouse is always lower than the cost of a rejection at the destination port.

---

## Building This Into Your Operations

Pre-shipment scoring is not a one-off check. It needs to be a standard step in your shipment release workflow — the last gate before a loading order is issued.

**At the lot assembly stage** — when you are assembling a shipment from processed inventory, the scoring system should evaluate every source batch that is being included. Batches with compliance flags should be identified at this stage so you can substitute compliant batches rather than discovering the issue after the lot is sealed.

**At the documentation stage** — when shipment documents are being assembled, the scoring system should verify that each required document is present, that the document covers the correct commodity, quantity, and lot, and that validity periods are met. Automated expiry alerts should flag documents that will expire before the estimated arrival date.

**At the final release stage** — before the loading order is issued, the shipment should have a confirmed Go or Conditional status on the scoring system. Conditional status should require sign-off from a named compliance officer, with the outstanding items documented. No-Go status should block the release until the issue is resolved.

This workflow adds 2-4 hours to your shipment preparation process. A single avoided rejection saves that time hundreds of times over.

---

## How OriginTrace Implements This

The Shipments module in OriginTrace applies this five-dimension scoring framework to every shipment. When a shipment is created, it is automatically evaluated across farm eligibility, supply chain integrity, contaminant compliance, documentation completeness, and regulatory alignment for the configured target markets.

Each dimension generates a score and a flag list. The flag list is actionable — each flag links to the specific farm, batch, document, or record that needs attention. The overall readiness decision — Go, Conditional, No-Go — is displayed prominently on the shipment detail page and is updated in real time as you resolve flags and upload documents.

The system supports multi-market scoring simultaneously. A single shipment destined for a German importer with secondary buyers in the UK can be scored against EUDR, UK due diligence, and buyer-specific requirements in a single evaluation. Flags that are specific to one market are labelled accordingly, so your compliance officer knows which issues are blocking which markets.

If you want to see this workflow in the context of your own commodity and export corridors, [request a demo](/demo).
