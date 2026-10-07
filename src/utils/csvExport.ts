import { FraudCaseRecord } from '../types/fraud';

/**
 * Escapes a cell value according to RFC 4180 CSV specifications.
 */
function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports an array of FraudCaseRecord objects as a downloadable CSV file for offline audits.
 */
export function exportFraudCasesToCSV(cases: FraudCaseRecord[], customFilename?: string): boolean {
  try {
    const headers = [
      'Case ID',
      'Created At',
      'Transaction ID',
      'Account User ID',
      'Amount (₹)',
      'User Historical Avg (₹)',
      'Risk Score',
      'Evaluation Threshold',
      'Status',
      'Merchant Category',
      'Location',
      'Channel',
      'Hour of Day',
      'Velocity Count (10m)',
      'Forensic Triggers',
      'Investigator Notes',
      'Resolved At'
    ];

    const rows = cases.map((c) => {
      const tx = c.transaction;
      const triggersJoined = (c.detectedReasons || []).join('; ');
      return [
        escapeCSV(c.caseId),
        escapeCSV(c.createdAt),
        escapeCSV(tx.transactionId),
        escapeCSV(tx.userId),
        escapeCSV(tx.amount.toFixed(2)),
        escapeCSV(tx.userHistoricalAvg?.toFixed(2) ?? '0.00'),
        escapeCSV(c.riskScore.toFixed(3)),
        escapeCSV(c.thresholdAtEvaluation.toFixed(2)),
        escapeCSV(c.status),
        escapeCSV(tx.merchantCategory),
        escapeCSV(tx.location),
        escapeCSV(tx.channel),
        escapeCSV(tx.hourOfDay),
        escapeCSV(tx.velocityWindowCount),
        escapeCSV(triggersJoined),
        escapeCSV(c.investigatorNotes),
        escapeCSV(c.resolvedAt || 'N/A')
      ].join(',');
    });

    // Prepend UTF-8 Byte Order Mark (BOM) for correct character display in Microsoft Excel and Numbers
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = customFilename || `NeuralBank_Fraud_Audit_Report_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Failed to export fraud cases CSV:', error);
    return false;
  }
}
