import { Role } from "./api";

/**
 * Fictional mock datasets used exclusively in local development preview mode
 * when the Spring Boot backend and PostgreSQL database are offline.
 *
 * This file is completely decoupled from production logic and contains only
 * synthetic UI testing fixtures.
 */

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface MockAnalytics {
  totalUsers: number;
  activeUsers: number;
  revokedUsers: number;
  citizens: number;
  workers: number;
  supervisors: number;
  admins: number;
}

export interface MockComplaint {
  id: string;
  status: string;
  description: string;
  severity?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface MockWorker {
  id: string;
  fullName: string;
  email: string;
  availability: "FREE" | "BUSY";
  activeTaskCount: number;
  queuedTaskCount: number;
}

export interface MockQueueTask {
  id: string;
  status: string;
  priority: string;
  queuedForAt?: string;
  queuedWorkerName?: string;
}

export interface MockWorkerTask {
  id: string;
  status: string;
  priority: string;
  dueAt?: string;
}

// In-memory state so UI actions (e.g., updating role or verifying) reflect during a preview session
let mockUsers: MockUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@cleancity.demo",
    fullName: "System Administrator",
    phone: "+91 98765 00001",
    role: "ADMIN",
    active: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "sarah.supervisor@cleancity.demo",
    fullName: "Sarah Chen (Supervisor)",
    phone: "+91 98765 00002",
    role: "SUPERVISOR",
    active: true,
    createdAt: "2026-01-05T09:30:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "rajesh.worker@cleancity.demo",
    fullName: "Rajesh Kumar (Field Worker)",
    phone: "+91 98765 00003",
    role: "WORKER",
    active: true,
    createdAt: "2026-01-10T11:15:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "anita.citizen@cleancity.demo",
    fullName: "Anita Sharma (Resident)",
    phone: "+91 98765 00004",
    role: "CITIZEN",
    active: true,
    createdAt: "2026-01-12T14:20:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "vikram.inactive@cleancity.demo",
    fullName: "Vikram Patel",
    phone: "+91 98765 00005",
    role: "WORKER",
    active: false,
    createdAt: "2026-01-14T16:45:00Z",
  },
];

let mockVerificationQueue: MockComplaint[] = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    status: "PENDING_VERIFICATION",
    description: "Overflowing commercial garbage dumpsters spilling onto the main walkway near Sector 4 Market.",
    severity: "HIGH",
    latitude: 12.9716,
    longitude: 77.5946,
    createdAt: "2026-10-28T14:15:00Z",
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    status: "PENDING_VERIFICATION",
    description: "Construction debris and plastic bags dumped adjacent to the community park entrance gate.",
    severity: "MEDIUM",
    latitude: 12.9754,
    longitude: 77.6012,
    createdAt: "2026-10-28T15:30:00Z",
  },
];

let mockReadyItems: MockComplaint[] = [
  {
    id: "c2000000-0000-0000-0000-000000000001",
    status: "VERIFIED",
    description: "Mixed municipal solid waste pile blocking the drainage corner on 5th Cross Road.",
    severity: "HIGH",
    latitude: 12.9698,
    longitude: 77.5892,
    createdAt: "2026-10-28T12:00:00Z",
  },
  {
    id: "c2000000-0000-0000-0000-000000000002",
    status: "VERIFIED",
    description: "Accumulated organic garden waste and dry branches causing pedestrian sidewalk obstruction.",
    severity: "LOW",
    latitude: 12.9781,
    longitude: 77.5934,
    createdAt: "2026-10-28T13:45:00Z",
  },
];

const mockWorkers: MockWorker[] = [
  {
    id: "w0000000-0000-0000-0000-000000000001",
    fullName: "Rajesh Kumar",
    email: "rajesh.worker@cleancity.demo",
    availability: "FREE",
    activeTaskCount: 0,
    queuedTaskCount: 0,
  },
  {
    id: "w0000000-0000-0000-0000-000000000002",
    fullName: "Sunita Verma",
    email: "sunita.worker@cleancity.demo",
    availability: "BUSY",
    activeTaskCount: 1,
    queuedTaskCount: 0,
  },
  {
    id: "w0000000-0000-0000-0000-000000000003",
    fullName: "Mohammed Farhan",
    email: "farhan.worker@cleancity.demo",
    availability: "FREE",
    activeTaskCount: 0,
    queuedTaskCount: 0,
  },
];

const mockQueuedTasks: MockQueueTask[] = [
  {
    id: "tq000000-0000-0000-0000-000000000001",
    status: "QUEUED",
    priority: "HIGH",
    queuedForAt: "2026-10-28T22:00:00Z",
    queuedWorkerName: "Sunita Verma",
  },
];

const mockResolutionTasks = [
  {
    task: {
      id: "t9000000-0000-0000-0000-000000000001",
      status: "RESOLUTION_SUBMITTED",
      priority: "HIGH",
      assignedWorkerName: "Rajesh Kumar",
      resolutionNote: "Waste fully cleared and sanitized with lime powder. Disposed of at Central Facility.",
      boundaryGeoJson: JSON.stringify({
        type: "Polygon",
        coordinates: [
          [
            [77.5936, 12.9706],
            [77.5956, 12.9706],
            [77.5956, 12.9726],
            [77.5936, 12.9726],
            [77.5936, 12.9706],
          ],
        ],
      }),
    },
    complaints: [
      {
        id: "c1000000-0000-0000-0000-000000000001",
        status: "CLEANUP_SUBMITTED",
        description: "Overflowing commercial garbage dumpsters spilling onto the main walkway near Sector 4 Market.",
        latitude: 12.9716,
        longitude: 77.5946,
        media: [
          { id: "asset-before-1", filename: "sector4-before.jpg", kind: "BEFORE" as const },
          { id: "asset-after-1", filename: "sector4-cleaned.jpg", kind: "AFTER" as const },
        ],
      },
    ],
  },
];

const mockWorkerTasks: MockWorkerTask[] = [
  {
    id: "wt000000-0000-0000-0000-000000000001",
    status: "ASSIGNED",
    priority: "HIGH",
    dueAt: "2026-10-29T12:00:00Z",
  },
  {
    id: "wt000000-0000-0000-0000-000000000002",
    status: "ON_SITE",
    priority: "MEDIUM",
    dueAt: "2026-10-29T17:00:00Z",
  },
];

export function handleMockApi<T>(path: string, init: RequestInit = {}): T {
  const method = (init.method ?? "GET").toUpperCase();

  // Profile
  if (path === "/profile") {
    return {
      id: "00000000-0000-0000-0000-000000000001",
      fullName: "Alex Rivera (Preview Mode)",
      email: "alex.preview@cleancity.demo",
      phone: "+91 98765 43210",
      role: "ADMIN",
      active: true,
      createdAt: "2026-01-15T08:30:00Z",
    } as unknown as T;
  }

  // Admin users and analytics
  if (path === "/admin/users" && method === "GET") {
    return mockUsers as unknown as T;
  }

  if (path === "/admin/users/analytics") {
    return {
      totalUsers: mockUsers.length + 140,
      activeUsers: mockUsers.filter(u => u.active).length + 135,
      revokedUsers: mockUsers.filter(u => !u.active).length + 5,
      citizens: 110,
      workers: 24,
      supervisors: 10,
      admins: 4,
    } as unknown as T;
  }

  if (path.startsWith("/admin/users/") && path.endsWith("/role") && method === "PUT") {
    const userId = path.split("/")[3];
    const body = init.body ? JSON.parse(init.body as string) : {};
    const user = mockUsers.find(u => u.id === userId);
    if (user && body.role) {
      user.role = body.role;
      return user as unknown as T;
    }
    return { id: userId, role: body.role } as unknown as T;
  }

  if (path.startsWith("/admin/users/") && path.endsWith("/active") && method === "PATCH") {
    const userId = path.split("/")[3];
    const body = init.body ? JSON.parse(init.body as string) : {};
    const user = mockUsers.find(u => u.id === userId);
    if (user && typeof body.active === "boolean") {
      user.active = body.active;
      return user as unknown as T;
    }
    return { id: userId, active: body.active } as unknown as T;
  }

  if (path.startsWith("/admin/users/") && method === "DELETE") {
    const userId = path.split("/")[3];
    mockUsers = mockUsers.filter(u => u.id !== userId);
    return undefined as unknown as T;
  }

  // Supervisor endpoints
  if (path === "/supervisor/verification-queue") {
    return mockVerificationQueue as unknown as T;
  }

  if (path === "/supervisor/assignment-ready") {
    return mockReadyItems as unknown as T;
  }

  if (path === "/supervisor/workers/availability") {
    return mockWorkers as unknown as T;
  }

  if (path === "/supervisor/tasks/assignment-queue") {
    return mockQueuedTasks as unknown as T;
  }

  if (path === "/supervisor/tasks/resolution-review-queue") {
    return mockResolutionTasks as unknown as T;
  }

  if (path.startsWith("/supervisor/complaints/") && path.endsWith("/verification") && method === "POST") {
    const id = path.split("/")[3];
    const body = init.body ? JSON.parse(init.body as string) : {};
    const verified = mockVerificationQueue.find(c => c.id === id) ?? {
      id,
      status: body.decision === "APPROVE" ? "VERIFIED" : "REJECTED",
      description: "Verified waste complaint",
      severity: body.severity ?? "MEDIUM",
      latitude: 12.9716,
      longitude: 77.5946,
      createdAt: new Date().toISOString(),
    };
    mockVerificationQueue = mockVerificationQueue.filter(c => c.id !== id);
    if (body.decision === "APPROVE") {
      mockReadyItems = [verified, ...mockReadyItems];
    }
    return verified as unknown as T;
  }

  if (path.startsWith("/supervisor/complaints/") && method === "GET") {
    const id = path.split("/")[3];
    return {
      complaint: {
        id,
        status: "PENDING_VERIFICATION",
        description: "Overflowing commercial garbage dumpsters spilling onto the main walkway near Sector 4 Market.",
        severity: "HIGH",
        latitude: 12.9716,
        longitude: 77.5946,
        createdAt: "2026-10-28T14:15:00Z",
        updatedAt: "2026-10-28T14:15:00Z",
      },
      reporter: {
        fullName: "Anita Sharma",
        email: "anita.citizen@cleancity.demo",
        phone: "+91 98765 00004",
      },
      media: [
        {
          id: "asset-before-1",
          filename: "sector4-dumpster-evidence.jpg",
          contentType: "image/jpeg",
          sizeBytes: 2450000,
          kind: "BEFORE",
        },
      ],
    } as unknown as T;
  }

  if (path === "/supervisor/tasks" && method === "POST") {
    return {
      id: "t-mock-created-" + Date.now(),
      status: "ASSIGNED",
      assignedWorkerName: "Rajesh Kumar",
      queuedWorkerName: null,
    } as unknown as T;
  }

  if (path.includes("/resolution-review") && method === "POST") {
    return undefined as unknown as T;
  }

  // Worker endpoints
  if (path === "/worker/tasks") {
    return mockWorkerTasks as unknown as T;
  }

  if (path.startsWith("/worker/tasks/") && path.endsWith("/location-events") && method === "POST") {
    return {
      insideGeofence: true,
      entryConfirmed: true,
      taskStatus: "ON_SITE",
    } as unknown as T;
  }

  if (path.startsWith("/worker/tasks/") && path.endsWith("/resolution") && method === "POST") {
    return undefined as unknown as T;
  }

  if (path.startsWith("/worker/tasks/") && method === "GET") {
    const taskId = path.split("/")[3];
    return {
      task: {
        id: taskId,
        status: "ON_SITE",
        priority: "HIGH",
        dueAt: "2026-10-29T12:00:00Z",
        resolutionNote: "",
        boundaryGeoJson: JSON.stringify({
          type: "Polygon",
          coordinates: [
            [
              [77.5936, 12.9706],
              [77.5956, 12.9706],
              [77.5956, 12.9726],
              [77.5936, 12.9726],
              [77.5936, 12.9706],
            ],
          ],
        }),
      },
      complaints: [
        {
          id: "c1000000-0000-0000-0000-000000000001",
          status: "IN_PROGRESS",
          description: "Clear solid waste dump near Sector 4 Market entrance.",
          latitude: 12.9716,
          longitude: 77.5946,
          severity: "HIGH",
          createdAt: "2026-10-28T14:15:00Z",
          media: [
            {
              id: "asset-before-1",
              filename: "sector4-dumpster-evidence.jpg",
              contentType: "image/jpeg",
              sizeBytes: 2450000,
              kind: "BEFORE" as const,
            },
          ],
        },
      ],
    } as unknown as T;
  }

  // Citizen complaints
  if (path === "/complaints" && method === "GET") {
    return [
      {
        id: "c1000000-0000-0000-0000-000000000001",
        status: "PENDING_VERIFICATION",
        description: "Overflowing commercial garbage dumpsters spilling onto the main walkway near Sector 4 Market.",
        severity: "HIGH",
        createdAt: "2026-10-28T14:15:00Z",
      },
      {
        id: "c3000000-0000-0000-0000-000000000001",
        status: "CLOSED",
        description: "Plastic and paper waste scattered across the park playground corner.",
        severity: "LOW",
        createdAt: "2026-10-24T09:00:00Z",
      },
    ] as unknown as T;
  }

  if (path === "/complaints" && method === "POST") {
    const body = init.body ? JSON.parse(init.body as string) : {};
    return {
      id: "c-mock-new-" + Date.now(),
      status: "PENDING_VERIFICATION",
      description: body.description ?? "Sample reported waste",
      latitude: body.location?.latitude ?? 12.9716,
      longitude: body.location?.longitude ?? 77.5946,
      severity: "PENDING",
      createdAt: new Date().toISOString(),
    } as unknown as T;
  }

  // Uploads
  if (path === "/uploads" && method === "POST") {
    return {
      assetId: "mock-uploaded-asset-" + Date.now(),
      filename: "preview-photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024 * 1024,
    } as unknown as T;
  }

  // Auth
  if (path === "/auth/login" || path === "/auth/register") {
    return {
      accessToken: "mock-preview-token-for-dev-ui-only",
      role: "ADMIN" as Role,
      userId: "00000000-0000-0000-0000-000000000001",
    } as unknown as T;
  }

  return {} as unknown as T;
}

/**
 * Generates an SVG image formatted as a Blob for preview mode so image loaders
 * display a realistic visual evidence placeholder instead of broken image boxes.
 */
export function getMockBlob(path: string): Blob {
  const isAfter = path.includes("after") || path.includes("clean");
  const color = isAfter ? "#10b981" : "#f59e0b";
  const label = isAfter ? "CLEANED SITE (AFTER EVIDENCE)" : "WASTE HOTSPOT (BEFORE EVIDENCE)";
  const icon = isAfter ? "✓" : "⚠";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#f8fafc"/>
    <rect x="16" y="16" width="568" height="368" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <circle cx="300" cy="160" r="54" fill="${color}" fill-opacity="0.15"/>
    <text x="300" y="178" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="${color}">${icon}</text>
    <text x="300" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#0f172a">${label}</text>
    <text x="300" y="295" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" text-anchor="middle" fill="#64748b">UI Preview Evidence Photo (Mock)</text>
  </svg>`;

  return new Blob([svg], { type: "image/svg+xml" });
}

