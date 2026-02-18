import type { ReportFilter } from '@shared/types'

export const reportsApi = {
  summary: (filter: ReportFilter) => window.api.reports.summary(filter),
  owners: () => window.api.reports.owners(),
}
