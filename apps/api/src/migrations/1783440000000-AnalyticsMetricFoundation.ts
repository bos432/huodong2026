import { MigrationInterface, QueryRunner } from "typeorm";

export class AnalyticsMetricFoundation1783440000000 implements MigrationInterface {
  name = "AnalyticsMetricFoundation1783440000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `analytics_daily_metrics` (`id` int NOT NULL AUTO_INCREMENT, `tenantScopeKey` varchar(32) NOT NULL DEFAULT 'platform', `dimensionType` varchar(40) NOT NULL DEFAULT 'platform', `dimensionKey` varchar(80) NOT NULL DEFAULT 'all', `metricDate` date NOT NULL, `metricKey` varchar(80) NOT NULL, `value` bigint NOT NULL DEFAULT 0, `amountFen` bigint NOT NULL DEFAULT 0, `breakdown` json NULL, `calculationVersion` varchar(80) NULL, `sourceRunId` varchar(80) NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_analytics_metric_unique` (`tenantScopeKey`,`dimensionType`,`dimensionKey`,`metricDate`,`metricKey`), INDEX `IDX_analytics_metric_query` (`tenantScopeKey`,`metricDate`,`metricKey`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `analytics_calculation_runs` (`id` int NOT NULL AUTO_INCREMENT, `runId` varchar(80) NOT NULL, `tenantScopeKey` varchar(32) NOT NULL DEFAULT 'platform', `startDate` date NOT NULL, `endDate` date NOT NULL, `status` varchar(30) NOT NULL DEFAULT 'pending', `triggerType` varchar(40) NOT NULL DEFAULT 'manual', `triggeredBy` varchar(80) NULL, `metricCount` int NOT NULL DEFAULT 0, `mismatchCount` int NOT NULL DEFAULT 0, `validationSummary` json NULL, `errorMessage` text NULL, `startedAt` datetime NULL, `completedAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_analytics_run_id` (`runId`), INDEX `IDX_analytics_run_scope_status` (`tenantScopeKey`,`status`,`createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE `analytics_calculation_runs`");
    await queryRunner.query("DROP TABLE `analytics_daily_metrics`");
  }
}
