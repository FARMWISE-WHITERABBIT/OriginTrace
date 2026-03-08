import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, numeric, varchar, uuid, date } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("user_role", ["admin", "aggregator", "agent", "quality_manager", "logistics_coordinator", "compliance_officer", "warehouse_supervisor", "buyer"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["pending", "verified", "flagged"]);
export const bagStatusEnum = pgEnum("bag_status", ["unused", "collected"]);

// Organizations
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  commodityTypes: text("commodity_types").array().notNull(),
  slug: text("slug"),
  subscriptionStatus: text("subscription_status").default("trial"),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}),
  inviteCode: text("invite_code"),
  activeLgas: text("active_lgas").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  commodities: jsonb("commodities").default([]),
  subscriptionTier: text("subscription_tier").default("starter"),
  featureFlags: jsonb("feature_flags").default({ financing: false, api_access: false, advanced_mapping: false, satellite_overlays: false, buyer_portal_access: false, dpp_access: false }),
  agentSeatLimit: integer("agent_seat_limit").default(5),
  monthlyCollectionLimit: integer("monthly_collection_limit").default(1000),
  dataRegion: text("data_region").default("default"),
  brandColors: jsonb("brand_colors"),
});

// Users (Profiles)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  replitId: text("replit_id").unique(),
  username: text("username").notNull(),
  email: text("email"),
  role: roleEnum("role").default("agent").notNull(),
  orgId: integer("org_id").references(() => organizations.id),
});

// Profiles (separate from users for Supabase auth)
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  orgId: integer("org_id").references(() => organizations.id),
  role: text("role").default("agent").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  assignedState: text("assigned_state"),
  assignedLga: text("assigned_lga"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// System Admins
export const systemAdmins = pgTable("system_admins", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// States (Nigerian location hierarchy)
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
});

// LGAs (Nigerian location hierarchy)
export const lgas = pgTable("lgas", {
  id: serial("id").primaryKey(),
  stateId: integer("state_id").notNull().references(() => states.id),
  name: text("name").notNull(),
});

// Villages (Nigerian location hierarchy)
export const villages = pgTable("villages", {
  id: serial("id").primaryKey(),
  lgaId: integer("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
});

// Locations (simplified lookup)
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  lga: text("lga").notNull(),
  community: text("community").notNull(),
});

// Farms
export const farms = pgTable("farms", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id).notNull(),
  farmerName: text("farmer_name").notNull(),
  locationId: integer("location_id").references(() => locations.id),
  boundary: jsonb("boundary").notNull(),
  legalityDocUrl: text("legality_doc_url"),
  complianceStatus: complianceStatusEnum("compliance_status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  commodity: text("commodity").default("cocoa"),
  areaHectares: numeric("area_hectares"),
  community: text("community"),
  consentTimestamp: timestamp("consent_timestamp", { withTimezone: true }),
  consentPhotoUrl: text("consent_photo_url"),
  consentSignature: text("consent_signature"),
  conflictStatus: varchar("conflict_status").default("clear"),
  deforestationCheck: jsonb("deforestation_check"),
});

// Bags
export const bags = pgTable("bags", {
  id: text("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id).notNull(),
  commodity: text("commodity").notNull(),
  status: bagStatusEnum("status").default("unused").notNull(),
  collectionBatchId: integer("collection_batch_id"),
  weightKg: numeric("weight_kg").default("0"),
  grade: text("grade").default("B"),
});

// Collection Batches
export const collectionBatches = pgTable("collection_batches", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  farmId: integer("farm_id").notNull().references(() => farms.id),
  agentId: uuid("agent_id").notNull(),
  status: text("status").default("collecting"),
  totalWeight: numeric("total_weight").default("0"),
  bagCount: integer("bag_count").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  yieldFlagReason: text("yield_flag_reason"),
  // Dispatch fields for chain-of-custody handover
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  dispatchedBy: uuid("dispatched_by"),
  dispatchDestination: text("dispatch_destination"),
  vehicleReference: text("vehicle_reference"),
  // Batch identification
  batchId: text("batch_id"),
  commodity: text("commodity"),
  gpsLat: numeric("gps_lat"),
  gpsLng: numeric("gps_lng"),
  estimatedBags: integer("estimated_bags"),
  estimatedWeight: numeric("estimated_weight"),
});

// Collections
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  bagId: text("bag_id").references(() => bags.id).notNull().unique(),
  farmId: integer("farm_id").references(() => farms.id).notNull(),
  agentId: integer("agent_id").references(() => users.id).notNull(),
  weight: integer("weight").notNull(),
  grade: text("grade").notNull(),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  batchId: uuid("batch_id"),
});

// Commodity Master
export const commodityMaster = pgTable("commodity_master", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  category: text("category").default("crop").notNull(),
  unit: text("unit").default("kg").notNull(),
  isActive: boolean("is_active").default(true),
  createdByOrgId: integer("created_by_org_id"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  grades: text("grades").array().default([]),
  moistureMin: numeric("moisture_min"),
  moistureMax: numeric("moisture_max"),
  collectionMetrics: jsonb("collection_metrics").default({}),
});

// Crop Standards (for yield validation)
export const cropStandards = pgTable("crop_standards", {
  id: serial("id").primaryKey(),
  commodity: text("commodity").notNull(),
  region: text("region").default("nigeria"),
  avgYieldPerHectare: numeric("avg_yield_per_hectare").notNull(),
  unit: text("unit").default("kg"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Farm Conflicts (spatial overlap detection)
export const farmConflicts = pgTable("farm_conflicts", {
  id: serial("id").primaryKey(),
  farmAId: integer("farm_a_id").notNull().references(() => farms.id),
  farmBId: integer("farm_b_id").notNull().references(() => farms.id),
  overlapRatio: numeric("overlap_ratio").notNull(),
  status: varchar("status").default("pending"),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Processing Runs (for finished goods pedigree)
export const processingRuns = pgTable("processing_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  runCode: text("run_code").notNull(),
  facilityName: text("facility_name").notNull(),
  facilityLocation: text("facility_location"),
  commodity: text("commodity").notNull(),
  inputWeightKg: numeric("input_weight_kg").notNull(),
  outputWeightKg: numeric("output_weight_kg"),
  recoveryRate: numeric("recovery_rate"),
  standardRecoveryRate: numeric("standard_recovery_rate").default("41.6"),
  massBalanceValid: boolean("mass_balance_valid").default(true),
  massBalanceVariance: numeric("mass_balance_variance"),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Processing Run Batches (link processing runs to collection batches)
export const processingRunBatches = pgTable("processing_run_batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  processingRunId: uuid("processing_run_id").notNull().references(() => processingRuns.id),
  collectionBatchId: integer("collection_batch_id").notNull().references(() => collectionBatches.id),
  weightContributionKg: numeric("weight_contribution_kg").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Finished Goods (QR-verified pedigree)
export const finishedGoods = pgTable("finished_goods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  pedigreeCode: text("pedigree_code").notNull(),
  productName: text("product_name").notNull(),
  productType: text("product_type").notNull(),
  processingRunId: uuid("processing_run_id").notNull().references(() => processingRuns.id),
  weightKg: numeric("weight_kg").notNull(),
  batchNumber: text("batch_number"),
  lotNumber: text("lot_number"),
  productionDate: date("production_date").notNull(),
  expiryDate: date("expiry_date"),
  destinationCountry: text("destination_country").default("EU"),
  buyerName: text("buyer_name"),
  buyerCompany: text("buyer_company"),
  ddsSubmitted: boolean("dds_submitted").default(false),
  ddsSubmittedAt: timestamp("dds_submitted_at", { withTimezone: true }),
  ddsReference: text("dds_reference"),
  qrCodeUrl: text("qr_code_url"),
  certificateUrl: text("certificate_url"),
  pedigreeVerified: boolean("pedigree_verified").default(true),
  verificationNotes: text("verification_notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Recovery Standards (for mass balance validation)
export const recoveryStandards = pgTable("recovery_standards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  commodity: text("commodity").notNull(),
  productType: text("product_type").notNull(),
  standardRecoveryRate: numeric("standard_recovery_rate").notNull(),
  tolerancePercent: numeric("tolerance_percent").default("5.0"),
  unit: text("unit").default("kg"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Agent Sync Status (for offline-first PWA)
export const agentSyncStatus = pgTable("agent_sync_status", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  agentId: uuid("agent_id").notNull(),
  pendingBatches: integer("pending_batches").default(0),
  pendingBags: integer("pending_bags").default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  isOnline: boolean("is_online").default(false),
  deviceInfo: jsonb("device_info"),
});

// Farmer Performance Ledger (for performance analytics)
export const farmerPerformanceLedger = pgTable("farmer_performance_ledger", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  farmId: integer("farm_id").notNull().references(() => farms.id),
  season: text("season").notNull(),
  totalCollections: integer("total_collections").default(0),
  totalWeightKg: numeric("total_weight_kg").default("0"),
  avgGrade: text("avg_grade"),
  yieldPerHectare: numeric("yield_per_hectare"),
  complianceScore: integer("compliance_score").default(0),
  paymentReliability: integer("payment_reliability").default(100),
  qualityConsistency: integer("quality_consistency").default(100),
  performanceIndex: integer("credit_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Compliance Files (farm verification documents)
export const complianceFiles = pgTable("compliance_files", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  farmId: integer("farm_id").notNull().references(() => farms.id),
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: uuid("uploaded_by"),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationStatus: text("verification_status").default("pending"),
  verificationNotes: text("verification_notes"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tenant Health Metrics (superadmin dashboard)
export const tenantHealthMetrics = pgTable("tenant_health_metrics", {
  orgId: integer("org_id"),
  orgName: text("org_name"),
  subscriptionTier: text("subscription_tier"),
  orgCreatedAt: timestamp("org_created_at", { withTimezone: true }),
  totalUsers: integer("total_users"),
  agentCount: integer("agent_count"),
  totalFarms: integer("total_farms"),
  totalBatches: integer("total_batches"),
  flaggedBatches: integer("flagged_batches"),
  totalWeightKg: numeric("total_weight_kg"),
  lastCollectionDate: timestamp("last_collection_date", { withTimezone: true }),
  growthTrend: text("growth_trend"),
});

// Relations
export const orgRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  profiles: many(profiles),
  farms: many(farms),
  bags: many(bags),
  collectionBatches: many(collectionBatches),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  org: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  collections: many(collections),
}));

export const profileRelations = relations(profiles, ({ one }) => ({
  org: one(organizations, {
    fields: [profiles.orgId],
    references: [organizations.id],
  }),
}));

export const farmRelations = relations(farms, ({ one, many }) => ({
  org: one(organizations, {
    fields: [farms.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [farms.locationId],
    references: [locations.id],
  }),
  collections: many(collections),
  collectionBatches: many(collectionBatches),
}));

export const bagRelations = relations(bags, ({ one }) => ({
  org: one(organizations, {
    fields: [bags.orgId],
    references: [organizations.id],
  }),
  collection: one(collections, {
    fields: [bags.id],
    references: [collections.bagId],
  }),
  collectionBatch: one(collectionBatches, {
    fields: [bags.collectionBatchId],
    references: [collectionBatches.id],
  }),
}));

export const collectionBatchRelations = relations(collectionBatches, ({ one, many }) => ({
  org: one(organizations, {
    fields: [collectionBatches.orgId],
    references: [organizations.id],
  }),
  farm: one(farms, {
    fields: [collectionBatches.farmId],
    references: [farms.id],
  }),
  bags: many(bags),
  processingRunBatches: many(processingRunBatches),
}));

export const collectionRelations = relations(collections, ({ one }) => ({
  bag: one(bags, {
    fields: [collections.bagId],
    references: [bags.id],
  }),
  farm: one(farms, {
    fields: [collections.farmId],
    references: [farms.id],
  }),
  agent: one(users, {
    fields: [collections.agentId],
    references: [users.id],
  }),
}));

export const stateRelations = relations(states, ({ many }) => ({
  lgas: many(lgas),
}));

export const lgaRelations = relations(lgas, ({ one, many }) => ({
  state: one(states, {
    fields: [lgas.stateId],
    references: [states.id],
  }),
  villages: many(villages),
}));

export const villageRelations = relations(villages, ({ one }) => ({
  lga: one(lgas, {
    fields: [villages.lgaId],
    references: [lgas.id],
  }),
}));

export const processingRunRelations = relations(processingRuns, ({ one, many }) => ({
  org: one(organizations, {
    fields: [processingRuns.orgId],
    references: [organizations.id],
  }),
  batches: many(processingRunBatches),
  finishedGoods: many(finishedGoods),
}));

export const processingRunBatchRelations = relations(processingRunBatches, ({ one }) => ({
  processingRun: one(processingRuns, {
    fields: [processingRunBatches.processingRunId],
    references: [processingRuns.id],
  }),
  collectionBatch: one(collectionBatches, {
    fields: [processingRunBatches.collectionBatchId],
    references: [collectionBatches.id],
  }),
}));

export const finishedGoodsRelations = relations(finishedGoods, ({ one }) => ({
  org: one(organizations, {
    fields: [finishedGoods.orgId],
    references: [organizations.id],
  }),
  processingRun: one(processingRuns, {
    fields: [finishedGoods.processingRunId],
    references: [processingRuns.id],
  }),
}));

export const farmerPerformanceLedgerRelations = relations(farmerPerformanceLedger, ({ one }) => ({
  org: one(organizations, {
    fields: [farmerPerformanceLedger.orgId],
    references: [organizations.id],
  }),
  farm: one(farms, {
    fields: [farmerPerformanceLedger.farmId],
    references: [farms.id],
  }),
}));

export const complianceFilesRelations = relations(complianceFiles, ({ one }) => ({
  org: one(organizations, {
    fields: [complianceFiles.orgId],
    references: [organizations.id],
  }),
  farm: one(farms, {
    fields: [complianceFiles.farmId],
    references: [farms.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true });
export const insertFarmSchema = createInsertSchema(farms).omit({ id: true, createdAt: true, complianceStatus: true });
export const insertBagSchema = createInsertSchema(bags);
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, collectedAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export const insertCollectionBatchSchema = createInsertSchema(collectionBatches).omit({ id: true, createdAt: true, completedAt: true });
export const insertCommodityMasterSchema = createInsertSchema(commodityMaster).omit({ id: true, createdAt: true });
export const insertProcessingRunSchema = createInsertSchema(processingRuns).omit({ createdAt: true, updatedAt: true });
export const insertFinishedGoodsSchema = createInsertSchema(finishedGoods).omit({ createdAt: true, updatedAt: true });
export const insertFarmerPerformanceLedgerSchema = createInsertSchema(farmerPerformanceLedger).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplianceFileSchema = createInsertSchema(complianceFiles).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Farm = typeof farms.$inferSelect;
export type Bag = typeof bags.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type CollectionBatch = typeof collectionBatches.$inferSelect;
export type CommodityMaster = typeof commodityMaster.$inferSelect;
export type CropStandard = typeof cropStandards.$inferSelect;
export type FarmConflict = typeof farmConflicts.$inferSelect;
export type ProcessingRun = typeof processingRuns.$inferSelect;
export type FinishedGoods = typeof finishedGoods.$inferSelect;
export type RecoveryStandard = typeof recoveryStandards.$inferSelect;
export type State = typeof states.$inferSelect;
export type Lga = typeof lgas.$inferSelect;
export type Village = typeof villages.$inferSelect;
export type FarmerPerformanceLedger = typeof farmerPerformanceLedger.$inferSelect;
export type ComplianceFile = typeof complianceFiles.$inferSelect;
export type AgentSyncStatus = typeof agentSyncStatus.$inferSelect;
export type TenantHealthMetrics = typeof tenantHealthMetrics.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertCollectionBatch = z.infer<typeof insertCollectionBatchSchema>;
export type InsertCommodityMaster = z.infer<typeof insertCommodityMasterSchema>;
export type InsertProcessingRun = z.infer<typeof insertProcessingRunSchema>;
export type InsertFinishedGoods = z.infer<typeof insertFinishedGoodsSchema>;
export type InsertFarmerPerformanceLedger = z.infer<typeof insertFarmerPerformanceLedgerSchema>;
export type InsertComplianceFile = z.infer<typeof insertComplianceFileSchema>;
