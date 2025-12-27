import type {
  ResumeProfile,
  JobPostingData,
  RefactorDataResponse,
  SkillGapAnalysisResponse,
  JobPostingStatus,
} from "@/types";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, message);
  }
  return response.json();
}

// Resume API
export const resumeApi = {
  async getMaster(): Promise<{ data: ResumeProfile | null }> {
    const response = await fetch(`${API_BASE}/resumes/master`);
    return handleResponse(response);
  },

  async updateMaster(data: ResumeProfile): Promise<{ data: ResumeProfile }> {
    const response = await fetch(`${API_BASE}/resumes/master`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    return handleResponse(response);
  },
};

// Job Postings API
export const jobPostingsApi = {
  async list(): Promise<JobPostingData[]> {
    const response = await fetch(`${API_BASE}/job-postings`);
    return handleResponse(response);
  },

  async get(id: string): Promise<JobPostingData> {
    const response = await fetch(`${API_BASE}/job-postings/${id}`);
    return handleResponse(response);
  },

  async create(data: {
    title: string;
    companyName?: string;
    jobDescription: string;
    postingUrl?: string;
    path?: string;
    data?: ResumeProfile;
  }): Promise<JobPostingData> {
    const response = await fetch(`${API_BASE}/job-postings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      companyName: string;
      jobDescription: string;
      postingUrl: string;
      path: string;
      data: ResumeProfile;
      status: JobPostingStatus;
    }>
  ): Promise<JobPostingData> {
    const response = await fetch(`${API_BASE}/job-postings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/job-postings/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new ApiError(response.status, message);
    }
  },

  async deleteFolder(folderPath: string): Promise<{ deletedCount: number }> {
    // Remove leading slash if present to build the URL correctly
    const pathWithoutLeadingSlash = folderPath.startsWith("/")
      ? folderPath.slice(1)
      : folderPath;
    const response = await fetch(
      `${API_BASE}/job-postings/folder/${pathWithoutLeadingSlash}`,
      {
        method: "DELETE",
      }
    );
    return handleResponse(response);
  },
};

// Refactor API
export const refactorApi = {
  async refactor(jobDescription: string): Promise<RefactorDataResponse> {
    const response = await fetch(`${API_BASE}/refactor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
    });
    return handleResponse(response);
  },
};

// Skill Gap API
export const skillGapApi = {
  async analyze(
    resume: ResumeProfile,
    jobDescription: string
  ): Promise<SkillGapAnalysisResponse> {
    const response = await fetch(`${API_BASE}/skill-gap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume, jobDescription }),
    });
    return handleResponse(response);
  },
};

// Ingest API
export const ingestApi = {
  async ingestFile(file: File): Promise<{ markdown: string; profile: ResumeProfile }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(response);
  },

  async ingestText(text: string): Promise<{ markdown: string; profile: ResumeProfile }> {
    const response = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },
};

