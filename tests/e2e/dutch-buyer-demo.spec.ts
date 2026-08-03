import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  assertLocalE2eEnvironment,
  authenticateContextWithCredentials,
  dateDaysFromNow,
  dateTimeLocalDaysFromNow,
  QA_PASSWORD,
} from './helpers/qa-flows';

const BUYER_EMAIL = 'dutch.buyer@demo.test';
const EXPORTER_EMAIL = 'dutch.exporter@demo.test';
const UNRELATED_BUYER_EMAIL = 'buyer@demo.test';
const SHIPMENT_CODE = 'WR-SHP-NL-PILOT-001';
const CONTRACT_REFERENCE = 'NL-COCOA-PILOT-001';
const PROFILE_NAME = 'Dutch Cocoa Buyer Pilot — HS 1801 — v1';
const JOURNEY_TENDER_TITLE = 'Dutch Buyer E2E Journey — Rotterdam — v1';

async function authenticatedPage(browser: Browser, email: string) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    try {
      [
        'origintrace_tour_admin',
        'origintrace_tour_aggregator',
        'origintrace_tour_agent',
        'origintrace_tour_quality_manager',
        'origintrace_tour_logistics_coordinator',
        'origintrace_tour_compliance_officer',
        'origintrace_tour_buyer',
      ].forEach((key) => localStorage.setItem(key, 'true'));
    } catch {}
  });
  await authenticateContextWithCredentials(context, email, QA_PASSWORD);
  return { context, page: await context.newPage() };
}

async function json(response: Awaited<ReturnType<BrowserContext['request']['get']>>) {
  return response.json() as Promise<Record<string, any>>;
}

test.describe('deterministic Dutch buyer exporter-to-buyer demo', () => {
  test('verifies traceability, proof, tenant isolation, and tender award', async ({ browser }) => {
    test.setTimeout(180_000);
    assertLocalE2eEnvironment();

    const exporter = await authenticatedPage(browser, EXPORTER_EMAIL);
    const buyer = await authenticatedPage(browser, BUYER_EMAIL);
    const unrelatedBuyer = await authenticatedPage(browser, UNRELATED_BUYER_EMAIL);

    try {
      // Exporter: API traceability is the precondition for the UI demo.
      const inventoryResponse = await exporter.context.request.get('/api/inventory');
      expect(inventoryResponse.status()).toBe(200);
      const inventory = await json(inventoryResponse);
      const pilotBatches = inventory.batches.filter((batch: any) => (
        ['WR-BCH-001', 'WR-BCH-002'].includes(batch.batch_code)
      ));
      expect(pilotBatches).toHaveLength(2);
      for (const batch of pilotBatches) {
        expect(batch.org_id).toBeTruthy();
        expect(batch.farm).toMatchObject({
          compliance_status: 'approved',
          boundary: { type: 'Polygon' },
        });
        expect(batch.bags).toHaveLength(batch.bag_count);
        expect(batch.bags.every((bag: any) => bag.collection_batch_id === batch.id)).toBe(true);
      }

      const shipmentsResponse = await exporter.context.request.get('/api/shipments?limit=100');
      expect(shipmentsResponse.status()).toBe(200);
      const shipmentsPayload = await json(shipmentsResponse);
      const shipmentList = shipmentsPayload.shipments ?? [];
      const pilotShipment = shipmentList.find((shipment: any) => shipment.shipment_code === SHIPMENT_CODE);
      expect(pilotShipment).toBeTruthy();

      const shipmentResponse = await exporter.context.request.get(`/api/shipments/${pilotShipment.id}`);
      expect(shipmentResponse.status()).toBe(200);
      const shipmentDetail = await json(shipmentResponse);
      expect(shipmentDetail.shipment).toMatchObject({
        shipment_code: SHIPMENT_CODE,
        destination_country: 'Netherlands',
        destination_port: 'Port of Rotterdam',
        compliance_profile: { name: PROFILE_NAME },
      });
      expect(shipmentDetail.items).toHaveLength(2);
      expect(shipmentDetail.items.every((item: any) => item.batch_data?.farm_id || item.batch_data?.farm)).toBe(true);
      expect(shipmentDetail.readiness.overall_score).toBeGreaterThanOrEqual(80);
      expect(shipmentDetail.readiness.decision).toBe('go');
      const regulatory = shipmentDetail.readiness.dimensions.find(
        (dimension: any) => dimension.name === 'Regulatory Alignment'
      );
      expect(regulatory.requirement_checks).toHaveLength(12);
      expect(regulatory.requirement_checks.every((check: any) => check.met)).toBe(true);

      const exporterGraphResponse = await exporter.context.request.get(
        `/api/supply-chain-graph?shipment_id=${pilotShipment.id}`
      );
      expect(exporterGraphResponse.status()).toBe(200);
      const exporterGraph = await json(exporterGraphResponse);
      expect(exporterGraph.nodes.filter((node: any) => node.type === 'shipment')).not.toHaveLength(0);
      expect(exporterGraph.nodes.filter((node: any) => node.type === 'batch')).toHaveLength(2);
      expect(exporterGraph.nodes.filter((node: any) => node.type === 'farm')).toHaveLength(2);

      await exporter.page.goto('/app/inventory', { waitUntil: 'domcontentloaded' });
      await expect(exporter.page.getByTestId(`batch-row-${pilotBatches[0].id}`)).toBeVisible();
      await expect(exporter.page.getByTestId(`batch-row-${pilotBatches[0].id}`)).toContainText(
        pilotBatches[0].farm.farmer_name
      );
      await exporter.page.getByRole('tab', { name: 'Bags' }).click();
      await exporter.page.getByPlaceholder(/Search by serial or batch ID/i).fill(
        pilotBatches[0].batch_code
      );
      await expect(exporter.page.getByTestId(`bag-row-${pilotBatches[0].bags[0].id}`)).toBeVisible();

      await exporter.page.goto(`/app/shipments/${pilotShipment.id}`, { waitUntil: 'domcontentloaded' });
      await expect(exporter.page.getByTestId('text-shipment-code')).toHaveText(SHIPMENT_CODE);
      await expect(exporter.page.getByTestId('text-readiness-score')).not.toHaveText('0');
      await expect(exporter.page.getByTestId('text-compliance-profile-name')).toHaveText(PROFILE_NAME);
      await expect(exporter.page.getByTestId('text-compliance-profile-disclaimer')).toContainText(
        'not approved or issued by a real buyer'
      );
      await expect(exporter.page.getByText('Evidence Packages', { exact: true })).toBeVisible();

      // Buyer: supplier, contract, shipment, proof, documents, and farm traceability.
      const suppliersResponse = await buyer.context.request.get('/api/supply-chain-links');
      expect(suppliersResponse.status()).toBe(200);
      const suppliersPayload = await json(suppliersResponse);
      const activeWhiteRabbitLink = suppliersPayload.links.find((link: any) => (
        link.status === 'active' && link.exporter_org?.name === 'WhiteRabbit Demo Co.'
      ));
      expect(activeWhiteRabbitLink).toBeTruthy();
      const exporterOrgId = activeWhiteRabbitLink.exporter_org.id;

      const contractsResponse = await buyer.context.request.get('/api/contracts?limit=100');
      expect(contractsResponse.status()).toBe(200);
      const contractsPayload = await json(contractsResponse);
      const pilotContract = contractsPayload.contracts.find(
        (contract: any) => contract.contract_reference === CONTRACT_REFERENCE
      );
      expect(pilotContract).toMatchObject({
        exporter_org_id: exporterOrgId,
        compliance_profile: {
          name: PROFILE_NAME,
          version: 'v1',
          is_placeholder: true,
          buyer_approved: false,
        },
      });
      expect(contractsPayload.compliance_profile_options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: pilotContract.compliance_profile_id,
            exporter_org_id: exporterOrgId,
            name: PROFILE_NAME,
          }),
        ])
      );

      // Inspect before invalid profile mutation; rejection must leave contracts unchanged.
      const contractCountBeforeInvalidPost = contractsPayload.contracts.length;
      const invalidProfileResponse = await buyer.context.request.post('/api/contracts', {
        data: {
          exporter_org_id: exporterOrgId,
          compliance_profile_id: '00000000-0000-4000-8000-999999999999',
          commodity: 'Cocoa beans',
        },
      });
      expect(invalidProfileResponse.status()).toBe(400);
      const contractsAfterInvalidPost = await json(
        await buyer.context.request.get('/api/contracts?limit=100')
      );
      expect(contractsAfterInvalidPost.contracts).toHaveLength(contractCountBeforeInvalidPost);

      // Inspect before mismatched linkage; API must reject and preserve the aligned proof.
      const mismatchShipment = shipmentList.find((shipment: any) => (
        shipment.id !== pilotShipment.id
        && shipment.compliance_profile_id !== pilotContract.compliance_profile_id
      ));
      expect(mismatchShipment).toBeTruthy();
      const mismatchResponse = await exporter.context.request.patch('/api/contracts', {
        data: { contract_id: pilotContract.id, shipment_id: mismatchShipment.id },
      });
      expect(mismatchResponse.status()).toBe(400);

      const buyerShipmentsResponse = await buyer.context.request.get('/api/buyer?section=shipments');
      expect(buyerShipmentsResponse.status()).toBe(200);
      const buyerShipments = await json(buyerShipmentsResponse);
      expect(buyerShipments.shipments).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: pilotShipment.id, shipment_code: SHIPMENT_CODE })])
      );

      const proofResponse = await buyer.context.request.get(
        `/api/buyer/shipments/${pilotShipment.id}/proof-status`
      );
      expect(proofResponse.status()).toBe(200);
      const proof = await json(proofResponse);
      expect(proof).toMatchObject({
        overall_verification_status: 'verified',
        compliance_profile: {
          name: PROFILE_NAME,
          version: 'v1',
          is_placeholder: true,
          buyer_approved: false,
        },
        profile_alignment: { status: 'aligned', aligned: true },
        readiness: { decision: 'go', ok: true },
        lab_results: { failed: 0, ok: true },
        evidence_package: { generated: true, expired: false, ok: true },
        documents: { active: 12, expired: 0, ok: true },
      });
      expect(proof.requirements_met).toHaveLength(12);
      expect(proof.requirements_missing).toHaveLength(0);

      const buyerGraphResponse = await buyer.context.request.get(
        `/api/supply-chain-graph?shipment_id=${pilotShipment.id}`
      );
      expect(buyerGraphResponse.status()).toBe(200);
      const buyerGraph = await json(buyerGraphResponse);
      expect(buyerGraph.nodes.filter((node: any) => node.type === 'batch')).toHaveLength(2);
      expect(buyerGraph.nodes.filter((node: any) => node.type === 'farm')).toHaveLength(2);

      await buyer.page.goto('/app/buyer/suppliers', { waitUntil: 'domcontentloaded' });
      await expect(buyer.page.getByText('WhiteRabbit Demo Co.', { exact: true }).first()).toBeVisible();
      await buyer.page.goto('/app/buyer/contracts', { waitUntil: 'domcontentloaded' });
      await expect(buyer.page.getByTestId(`card-contract-${pilotContract.id}`)).toContainText(PROFILE_NAME);
      await expect(buyer.page.getByTestId(`contract-profile-${pilotContract.id}`)).toContainText(
        'Illustrative placeholder'
      );
      await buyer.page.goto('/app/buyer/shipments', { waitUntil: 'domcontentloaded' });
      await expect(buyer.page.getByTestId(`text-shipment-code-${pilotShipment.id}`)).toHaveText(SHIPMENT_CODE);
      await buyer.page.getByTestId(`button-proof-panel-toggle-${pilotShipment.id}`).click();
      await expect(buyer.page.getByTestId(`buyer-profile-${pilotShipment.id}`)).toContainText(PROFILE_NAME);
      await expect(buyer.page.getByTestId(`requirements-${pilotShipment.id}`)).toContainText('12/12 met');
      await expect(buyer.page.getByTestId(`row-documents-${pilotShipment.id}`)).toContainText('12/12 active');

      // Unrelated buyer: no Dutch profile option, shipment, or proof access.
      const unrelatedContractsResponse = await unrelatedBuyer.context.request.get('/api/contracts?limit=100');
      expect(unrelatedContractsResponse.status()).toBe(200);
      const unrelatedContracts = await json(unrelatedContractsResponse);
      expect(unrelatedContracts.compliance_profile_options).toEqual([]);
      expect(unrelatedContracts.contracts.some(
        (contract: any) => contract.contract_reference === CONTRACT_REFERENCE
      )).toBe(false);
      const unrelatedBuyerShipments = await json(
        await unrelatedBuyer.context.request.get('/api/buyer?section=shipments')
      );
      expect(unrelatedBuyerShipments.shipments.some(
        (shipment: any) => shipment.id === pilotShipment.id
      )).toBe(false);
      const unrelatedProof = await unrelatedBuyer.context.request.get(
        `/api/buyer/shipments/${pilotShipment.id}/proof-status`
      );
      expect([403, 404]).toContain(unrelatedProof.status());

      // Buyer creates a deterministic tender. Inspect before and verify after mutation.
      let buyerTenders = await json(await buyer.context.request.get('/api/tenders?limit=100'));
      let journeyTender = buyerTenders.tenders.find(
        (tender: any) => tender.title === JOURNEY_TENDER_TITLE
      );
      if (!journeyTender) {
        const createTenderResponse = await buyer.context.request.post('/api/tenders', {
          data: {
            title: JOURNEY_TENDER_TITLE,
            commodity: 'Cocoa beans (HS 1801)',
            quantity_mt: 2.07,
            currency: 'EUR',
            delivery_deadline: dateDaysFromNow(75),
            destination_country: 'Netherlands',
            destination_port: 'Port of Rotterdam',
            quality_requirements: {
              compliance_profile_id: pilotContract.compliance_profile_id,
              placeholder_profile: true,
            },
            certifications_required: ['Rainforest Alliance Certificate'],
            regulation_framework: 'EUDR',
            visibility: 'invited',
            invited_orgs: [exporterOrgId],
            closes_at: dateTimeLocalDaysFromNow(30),
          },
        });
        expect(createTenderResponse.status()).toBe(200);
        journeyTender = (await json(createTenderResponse)).tender;
        buyerTenders = await json(await buyer.context.request.get('/api/tenders?limit=100'));
        expect(buyerTenders.tenders).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: journeyTender.id, buyer_org_id: pilotContract.buyer_org_id })])
        );
      }
      expect(journeyTender).toMatchObject({
        buyer_org_id: pilotContract.buyer_org_id,
        destination_country: 'Netherlands',
        destination_port: 'Port of Rotterdam',
      });

      await buyer.page.goto('/app/buyer/tenders', { waitUntil: 'domcontentloaded' });
      await expect(buyer.page.getByTestId(`card-tender-${journeyTender.id}`)).toContainText(
        JOURNEY_TENDER_TITLE
      );

      // Exporter inspects its bids before mutation, submits, then verifies the row and UI.
      let exporterBidsPayload = await json(
        await exporter.context.request.get(`/api/tenders/${journeyTender.id}/bids`)
      );
      let journeyBid = exporterBidsPayload.bids.find(
        (bid: any) => bid.exporter_org_id === exporterOrgId
      );
      if (!journeyBid) {
        expect(journeyTender.status).toBe('open');
        const submitBidResponse = await exporter.context.request.post(
          `/api/tenders/${journeyTender.id}/bids`,
          {
            data: {
              price_per_mt: 4200,
              quantity_available_mt: 2.07,
              delivery_date: dateDaysFromNow(60),
              notes: 'Illustrative Dutch buyer demo bid; no real buyer approval is implied.',
              certifications: ['Rainforest Alliance Certificate (placeholder demo evidence)'],
            },
          }
        );
        expect(submitBidResponse.status()).toBe(200);
        journeyBid = (await json(submitBidResponse)).bid;
        exporterBidsPayload = await json(
          await exporter.context.request.get(`/api/tenders/${journeyTender.id}/bids`)
        );
        expect(exporterBidsPayload.bids).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: journeyBid.id, status: 'submitted' })])
        );
      }

      if (journeyTender.status === 'open') {
        await exporter.page.goto('/app/tenders', { waitUntil: 'domcontentloaded' });
        await expect(exporter.page.getByTestId(`card-tender-${journeyTender.id}`)).toContainText(
          JOURNEY_TENDER_TITLE
        );
        await expect(exporter.page.getByTestId(`badge-my-bid-${journeyTender.id}`)).toContainText('submitted');
      }

      // Buyer inspects the submitted bid, awards it, and verifies tender/bid/contract postconditions.
      let buyerBidsPayload = await json(
        await buyer.context.request.get(`/api/tenders/${journeyTender.id}/bids`)
      );
      const buyerVisibleBid = buyerBidsPayload.bids.find((bid: any) => bid.id === journeyBid.id);
      expect(buyerVisibleBid).toMatchObject({
        exporter_org_id: exporterOrgId,
        exporter_org: { name: 'WhiteRabbit Demo Co.' },
      });

      if (journeyTender.status !== 'awarded') {
        expect(buyerVisibleBid.status).toBe('submitted');
        const awardResponse = await buyer.context.request.patch('/api/tenders', {
          data: { tender_id: journeyTender.id, award_bid_id: journeyBid.id },
        });
        expect(awardResponse.status()).toBe(200);
        const awardPayload = await json(awardResponse);
        expect(awardPayload.contract).toMatchObject({
          buyer_org_id: pilotContract.buyer_org_id,
          exporter_org_id: exporterOrgId,
          status: 'active',
        });
      }

      buyerTenders = await json(await buyer.context.request.get('/api/tenders?limit=100'));
      journeyTender = buyerTenders.tenders.find((tender: any) => tender.id === journeyTender.id);
      expect(journeyTender.status).toBe('awarded');
      buyerBidsPayload = await json(
        await buyer.context.request.get(`/api/tenders/${journeyTender.id}/bids`)
      );
      expect(buyerBidsPayload.bids.find((bid: any) => bid.id === journeyBid.id).status).toBe('awarded');

      await buyer.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(buyer.page.getByTestId(`badge-tender-status-${journeyTender.id}`)).toHaveText('awarded');
    } finally {
      await Promise.all([
        exporter.context.close(),
        buyer.context.close(),
        unrelatedBuyer.context.close(),
      ]);
    }
  });
});
