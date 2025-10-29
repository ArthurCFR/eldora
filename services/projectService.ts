/**
 * Project Service
 * CRUD operations for managing projects
 */

import { Project, ProjectListItem, AttentionPoint } from '../types/project';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://172.28.191.115:3001';

/**
 * List all available projects
 */
export async function listProjects(): Promise<ProjectListItem[]> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return await response.json();
  } catch (error) {
    console.error('Error listing projects:', error);
    throw error;
  }
}

/**
 * Get a specific project by ID
 */
export async function getProject(projectId: string): Promise<Project> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${projectId}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData: {
  name: string;
  description: string;
  companyContext?: string;
  reportContext?: string;
  reportGoal?: string;
  startDate?: string;
  settings?: {
    industry?: string;
    reportType?: string;
    language?: string;
    reportScheduleType?: 'fixed' | 'per-appointment';
    reportFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  };
}): Promise<Project> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Update an existing project
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Upload a document to a project
 */
export async function uploadDocument(
  projectId: string,
  file: File
): Promise<{ documentId: string; parsedData?: any }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload document');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Analyze project with Claude and generate configuration
 */
export async function analyzeProjectWithClaude(
  projectId: string,
  description: string,
  documents: string[]
): Promise<{
  attentionPoints: AttentionPoint[];
  conversationStyle: string;
  reportTemplate: any;
}> {
  try {
    const response = await fetch(`${PROXY_URL}/api/projects/${projectId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        documents,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing project:', error);
    throw error;
  }
}
