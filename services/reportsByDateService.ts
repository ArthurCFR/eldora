/**
 * Reports by Date Service
 * Manages loading and saving reports for specific dates
 */

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://172.28.191.115:3001';

export interface ReportByDate {
  id: string;
  projectId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  userName: string;
  eventName: string;
  sales: { [productName: string]: number };
  salesAmounts?: { [productName: string]: number };
  totalAmount?: number;
  customerFeedback: string;
  keyInsights: string[];
  emotionalContext: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

/**
 * Get all reports for a project
 */
export async function getProjectReports(projectId: string): Promise<ReportByDate[]> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/reports`);
    if (!response.ok) {
      throw new Error('Failed to fetch project reports');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching project reports:', error);
    throw error;
  }
}

/**
 * Get a specific report by date and user
 */
export async function getReportByDate(
  projectId: string,
  date: string,
  userName: string
): Promise<ReportByDate | null> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/reports/date/${date}?userName=${encodeURIComponent(userName)}`);
    if (response.status === 404) {
      return null; // No report for this date and user
    }
    if (!response.ok) {
      throw new Error('Failed to fetch report by date');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching report by date:', error);
    throw error;
  }
}

/**
 * Create or update a report for a specific date
 */
export async function saveReportForDate(
  projectId: string,
  date: string,
  reportData: {
    userName: string;
    eventName: string;
    sales: { [productName: string]: number };
    salesAmounts?: { [productName: string]: number };
    totalAmount?: number;
    customerFeedback: string;
    keyInsights: string[];
    emotionalContext: string | null;
  }
): Promise<ReportByDate> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        ...reportData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save report');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving report for date:', error);
    throw error;
  }
}

/**
 * Delete a report by date and user
 */
export async function deleteReportByDate(
  projectId: string,
  date: string,
  userName: string
): Promise<void> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/reports/date/${date}?userName=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete report');
    }
  } catch (error) {
    console.error('Error deleting report by date:', error);
    throw error;
  }
}

/**
 * Get a map of existing reports (date -> reportId)
 * Used to update report slots with existing reports
 */
export async function getReportsMap(projectId: string): Promise<Map<string, string>> {
  try {
    const reports = await getProjectReports(projectId);
    const reportsMap = new Map<string, string>();

    reports.forEach(report => {
      reportsMap.set(report.date, report.id);
    });

    return reportsMap;
  } catch (error) {
    console.error('Error building reports map:', error);
    return new Map();
  }
}

/**
 * Send/finalize a report (mark as sent)
 */
export async function sendReportByDate(
  projectId: string,
  reportId: string
): Promise<ReportByDate> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/reports/${reportId}/send`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send report');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending report:', error);
    throw error;
  }
}
