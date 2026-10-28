# Smart Waste API contract additions

All endpoints below require `Authorization: Bearer <JWT>`. The backend is the authoritative RBAC layer; the frontend route guards only improve navigation.

| Endpoint | Authorized role | Purpose |
| --- | --- | --- |
| `GET /api/v1/profile` | Any authenticated user | Returns the caller's own `id`, `fullName`, `email`, `phone`, `role`, `active`, and `createdAt`. |
| `GET /api/v1/worker/tasks/{taskId}` | Assigned worker | Returns the task, geofence GeoJSON, complaint descriptions/locations, and attached evidence metadata. |
| `POST /api/v1/worker/tasks/{taskId}/resolution` | Assigned worker on site / rework | Accepts `{ "afterAssetIds": ["uuid"], "note": "optional" }`; requires at least one worker-owned uploaded image and moves the task to `RESOLUTION_SUBMITTED`. |
| `GET /api/v1/supervisor/tasks/resolution-review-queue` | Supervisor or admin | Returns cleanup submissions in `RESOLUTION_SUBMITTED`, including before and after evidence metadata. |
| `POST /api/v1/supervisor/tasks/{taskId}/resolution-review` | Supervisor or admin | Accepts `{ "accepted": true }` to close the task/complaints, or `{ "accepted": false }` to request rework. |
| `GET /api/v1/media/{assetId}/content` | Owner, assigned worker, supervisor, admin | Streams a protected image. A worker may only load evidence attached to one of their assigned tasks. |
| `GET /api/v1/admin/users/analytics` | Admin | Returns live current-user totals: active/revoked totals and counts for citizens, workers, supervisors, and admins. |
| `PATCH /api/v1/admin/users/{id}/active` | Admin | Accepts `{ "active": false }` to revoke an account immediately, or `true` to restore it. Revoked JWTs are rejected on subsequent API calls. |
| `DELETE /api/v1/admin/users/{id}` | Admin | Removes an account from current-user lists and anonymizes its personal data while preserving task, complaint, and audit references. |

Image upload remains `POST /api/v1/uploads` with multipart field `file`. Only JPEG, PNG, and WEBP files up to 10 MB are accepted. The returned `assetId` is passed to the resolution endpoint.

## Resolution lifecycle

`ON_SITE` → worker uploads after photos → `RESOLUTION_SUBMITTED` → supervisor accepts → `COMPLETED` and complaint `CLOSED`.

If the supervisor rejects the evidence, the task becomes `REWORK_REQUIRED` and its complaints return to `IN_PROGRESS`; the worker can upload new evidence and resubmit.

## Worker assignment and queue rule

At task creation the service locks and assigns the preferred free worker. If that worker is busy but another active worker is free, it assigns that available worker instead. A queue reservation is created only when no worker is free. Once a queued task reaches its configured delay, the scheduler assigns it to any free worker; it does not wait unnecessarily for the originally reserved worker.
