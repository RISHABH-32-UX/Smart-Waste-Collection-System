package com.capstone.smartwaste.task;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskService {
  private static final String ACTIVE_WORK_SQL = "'ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED'";
  private final JdbcTemplate jdbc;

  public TaskService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  // ── Task creation ──────────────────────────────────────────────────

  /**
   * Assign a free worker immediately, or queue for a busy worker when a queue
   * mode is chosen.  When the supervisor picks a QUEUE mode and the selected
   * worker is currently busy, the task is queued for that specific worker
   * rather than being redirected to another free worker.
   */
  @Transactional
  public TaskView create(UUID supervisorId, CreateTask request) {
    if (request.complaintIds().isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one complaint is required");
    if (request.workerId() == null || request.assignmentMode() == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a worker and assignment mode");
    if (!isEligibleWorker(request.workerId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");

    UUID freeWorkerId = lockPreferredFreeWorker(request.workerId());
    boolean queued;
    UUID assignedWorkerId;
    UUID queuedWorkerId = null;

    if (freeWorkerId != null) {
      // Selected worker is free → assign immediately regardless of mode.
      queued = false;
      assignedWorkerId = freeWorkerId;
    } else if (request.assignmentMode() == AssignmentMode.IMMEDIATE) {
      // Selected worker busy + IMMEDIATE → try any free worker, else fail.
      freeWorkerId = lockFirstFreeWorker();
      if (freeWorkerId == null)
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "No free worker is available. Choose a two- or three-hour queue option.");
      queued = false;
      assignedWorkerId = freeWorkerId;
    } else {
      // Selected worker busy + QUEUE mode → queue for that specific worker.
      lockAndValidateWorker(request.workerId());
      if (hasQueuedTask(request.workerId()))
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Selected worker already has a queued task. Choose another busy worker.");
      queued = true;
      assignedWorkerId = null;
      queuedWorkerId = request.workerId();
    }

    UUID geofenceId = UUID.randomUUID();
    createGeofence(geofenceId, request.complaintIds(), request.boundary());
    UUID taskId = UUID.randomUUID();
    Instant queuedFor = queued
        ? Instant.now().plus(Duration.ofHours(request.assignmentMode().delayHours()))
        : null;
    Timestamp dueAtTs = request.dueAt() == null ? null : Timestamp.from(request.dueAt());
    Timestamp queuedForTs = queuedFor == null ? null : Timestamp.from(queuedFor);
    jdbc.update("""
      insert into tasks(id,geofence_id,assigned_worker_id,queued_worker_id,status,priority,due_at,queued_for_at)
      values (?,?,?,?,?,?,?,?)
      """, taskId, geofenceId, assignedWorkerId, queuedWorkerId,
      queued ? "QUEUED" : "ASSIGNED", request.priority(), dueAtTs, queuedForTs);

    String complaintStatus = queued ? "ASSIGNMENT_QUEUED" : "ASSIGNED";
    for (UUID complaintId : request.complaintIds()) {
      int changed = jdbc.update(
          "update complaints set status=?,updated_at=now(),version=version+1 where id=? and status='VERIFIED'",
          complaintStatus, complaintId);
      if (changed != 1)
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Complaint must be verified and unassigned before task allocation");
      jdbc.update("insert into task_complaints(task_id,complaint_id) values(?,?)", taskId, complaintId);
    }
    audit(supervisorId, queued ? "TASK_QUEUED" : "TASK_ASSIGNED", "TASK", taskId);
    return get(taskId, supervisorId, true);
  }

  // ── Queries ────────────────────────────────────────────────────────

  public List<WorkerAvailability> workerAvailability() {
    return jdbc.query(
      "select u.id,u.full_name,u.email, " +
      "count(distinct t.id) filter (where t.status in (" + ACTIVE_WORK_SQL + ")) active_task_count, " +
      "count(distinct q.id) filter (where q.status='QUEUED') queued_task_count " +
      "from app_users u " +
      "left join tasks t on t.assigned_worker_id=u.id " +
      "left join tasks q on q.queued_worker_id=u.id " +
      "where u.role='WORKER' and u.active=true " +
      "group by u.id,u.full_name,u.email " +
      "order by count(distinct t.id) filter (where t.status in (" + ACTIVE_WORK_SQL + ")), u.full_name",
      (rs, row) -> {
        int active = rs.getInt("active_task_count");
        return new WorkerAvailability(
          UUID.fromString(rs.getString("id")), rs.getString("full_name"), rs.getString("email"),
          active == 0 ? "FREE" : "BUSY", active, rs.getInt("queued_task_count"));
      });
  }

  public List<TaskView> assignmentQueue() {
    return jdbc.query(
      taskSelect() + " where t.status in ('QUEUED','AWAITING_ASSIGNMENT') order by t.queued_for_at nulls last, t.created_at",
      (rs, row) -> view(rs));
  }

  public List<TaskView> activeTasks() {
    return jdbc.query(
      taskSelect() + " where t.status not in ('COMPLETED','CANCELLED') order by t.created_at desc",
      (rs, row) -> view(rs));
  }

  public List<TaskView> workerTasks(UUID workerId) {
    return jdbc.query(
      taskSelect() + " where (t.assigned_worker_id=? or t.queued_worker_id=?) and t.status not in ('COMPLETED','CANCELLED') "
        + "order by case t.priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3 else 4 end, t.due_at nulls last",
      (rs, row) -> view(rs), workerId, workerId);
  }

  /** The worker's assigned site, its complaint context, and before/after evidence. */
  public TaskDetail workerTaskDetail(UUID taskId, UUID workerId) {
    return taskDetail(get(taskId, workerId, false));
  }

  /** Cleanup submissions awaiting the supervisor's final validation. */
  public List<TaskDetail> resolutionReviewQueue() {
    return jdbc.query(
      taskSelect() + " where t.status='RESOLUTION_SUBMITTED' order by t.updated_at asc",
      (rs, row) -> view(rs)).stream().map(this::taskDetail).toList();
  }

  public TaskDetail resolutionReviewDetail(UUID taskId) {
    return taskDetail(get(taskId, null, true));
  }

  public TaskView get(UUID taskId, UUID actorId, boolean privileged) {
    List<TaskView> tasks = jdbc.query(
      taskSelect() + " where t.id=? and (? or t.assigned_worker_id=? or t.queued_worker_id=?)",
      (rs, row) -> view(rs), taskId, privileged, actorId, actorId);
    if (tasks.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
    return tasks.get(0);
  }

  // ── Queued-task scheduling ─────────────────────────────────────────

  /** Called every minute.  Due queued work goes to any currently free worker. */
  @Transactional
  public int assignDueQueuedTasks() {
    List<QueuedTask> dueTasks = jdbc.query("""
      select id,queued_worker_id from tasks
      where status='QUEUED' and queued_for_at <= now()
      order by queued_for_at
      for update skip locked
      """, (rs, row) -> new QueuedTask(
          UUID.fromString(rs.getString("id")), nullableUuid(rs, "queued_worker_id")));
    int assigned = 0;
    for (QueuedTask queued : dueTasks) {
      UUID freeWorkerId = lockFirstFreeWorker();
      if (freeWorkerId != null) {
        jdbc.update(
          "update tasks set assigned_worker_id=?,queued_worker_id=null,queued_for_at=null,status='ASSIGNED',updated_at=now() where id=? and status='QUEUED'",
          freeWorkerId, queued.taskId());
        jdbc.update(
          "update complaints set status='ASSIGNED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNMENT_QUEUED'",
          queued.taskId());
        audit(null, "QUEUED_TASK_AUTO_ASSIGNED", "TASK", queued.taskId());
        assigned++;
      } else if (queued.workerId() == null || !lockWorker(queued.workerId()) || !isEligibleWorker(queued.workerId())) {
        jdbc.update(
          "update tasks set status='AWAITING_ASSIGNMENT',queued_worker_id=null,queued_for_at=null,updated_at=now() where id=?",
          queued.taskId());
        jdbc.update(
          "update complaints set status='VERIFIED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id",
          queued.taskId());
        audit(null, "QUEUE_WORKER_UNAVAILABLE", "TASK", queued.taskId());
      } else {
        // Delay further rather than assigning two active jobs to one worker.
        jdbc.update(
          "update tasks set queued_for_at=now() + interval '15 minutes',updated_at=now() where id=?",
          queued.taskId());
        audit(null, "QUEUED_TASK_DELAYED", "TASK", queued.taskId());
      }
    }
    return assigned;
  }

  /** Periodically check if queued tasks can be assigned early (e.g. when a worker finishes). */
  @Transactional
  public void checkQueuedTasks() {
    List<QueuedTask> queued = jdbc.query("""
      select t.id,t.queued_worker_id from tasks t
      where t.status='QUEUED' and t.queued_worker_id is not null
      for update skip locked
      """, (rs, row) -> new QueuedTask(
          UUID.fromString(rs.getString("id")), nullableUuid(rs, "queued_worker_id")));
    for (QueuedTask q : queued) {
      if (q.workerId() != null && isWorkerFree(q.workerId())) {
        lockWorker(q.workerId());
        jdbc.update(
          "update tasks set assigned_worker_id=?,queued_worker_id=null,queued_for_at=null,status='ASSIGNED',updated_at=now() where id=? and status='QUEUED'",
          q.workerId(), q.taskId());
        jdbc.update(
          "update complaints set status='ASSIGNED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNMENT_QUEUED'",
          q.taskId());
        audit(null, "QUEUED_TASK_EARLY_ASSIGNED", "TASK", q.taskId());
      }
    }
  }

  // ── Worker location & geofence arrival ─────────────────────────────

  @Transactional
  public LocationResult recordLocation(UUID taskId, UUID workerId, LocationEvent request) {
    Double accuracy = request.accuracyMeters();
    Instant capturedAt = request.getCapturedAt();
    double latitude = request.latitude();
    double longitude = request.longitude();

    // Tolerate null accuracy (default to 0) but reject obviously bad values.
    double accuracyValue = accuracy != null ? accuracy : 0;
    if (accuracyValue < 0 || accuracyValue > 100)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location accuracy is out of range");

    Integer taskCount = jdbc.queryForObject(
      "select count(*) from tasks where id=? and assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE')",
      Integer.class, taskId, workerId);
    if (taskCount == null || taskCount != 1)
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task is not active for this worker");

    Boolean inside = jdbc.queryForObject("""
      select ST_Covers(g.boundary::geometry, ST_SetSRID(ST_MakePoint(?,?),4326)::geometry)
      from tasks t join geofences g on g.id=t.geofence_id where t.id=? and g.active=true
      """, Boolean.class, longitude, latitude, taskId);

    Timestamp recordedAtTs = Timestamp.from(capturedAt != null ? capturedAt : Instant.now());
    jdbc.update(
      "insert into worker_locations(task_id,worker_id,point,accuracy_meters,recorded_at) values(?,?,ST_SetSRID(ST_MakePoint(?,?),4326)::geography,?,?)",
      taskId, workerId, longitude, latitude, accuracyValue,
      recordedAtTs);

    boolean trustworthy = accuracyValue <= 50;
    boolean entryConfirmed = trustworthy && Boolean.TRUE.equals(inside);
    if (entryConfirmed) {
      jdbc.update(
        "update tasks set status='ON_SITE',updated_at=now() where id=? and status in ('ASSIGNED','ACCEPTED')",
        taskId);
      jdbc.update(
        "update complaints set status='IN_PROGRESS',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNED'",
        taskId);
      audit(workerId, "GEOFENCE_ENTERED", "TASK", taskId);
    }
    return new LocationResult(Boolean.TRUE.equals(inside), entryConfirmed, get(taskId, workerId, false).status());
  }

  @Transactional
  public TaskView arriveAtSite(UUID taskId, UUID workerId) {
    Integer taskCount = jdbc.queryForObject(
      "select count(*) from tasks where id=? and assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE')",
      Integer.class, taskId, workerId);
    if (taskCount == null || taskCount != 1)
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task is not active for this worker");

    jdbc.update(
      "update tasks set status='ON_SITE',updated_at=now() where id=? and status in ('ASSIGNED','ACCEPTED')",
      taskId);
    jdbc.update(
      "update complaints set status='IN_PROGRESS',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNED'",
      taskId);
    audit(workerId, "ARRIVED_ON_SITE", "TASK", taskId);
    return get(taskId, workerId, false);
  }

  // ── Resolution workflow ────────────────────────────────────────────

  @Transactional
  public void submitResolution(UUID taskId, UUID workerId, List<UUID> afterAssets, String note) {
    String cleanedNote = note == null || note.isBlank() ? null : note.trim();
    if (cleanedNote != null && cleanedNote.length() > 2000)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resolution note must be 2,000 characters or fewer");
    int updated = jdbc.update("""
      update tasks set status='RESOLUTION_SUBMITTED',resolution_note=?,updated_at=now()
      where id=? and assigned_worker_id=? and status in ('ON_SITE','REWORK_REQUIRED')
      """, cleanedNote, taskId, workerId);
    if (updated != 1)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Task must be on site before submitting resolution");
    for (UUID assetId : afterAssets) {
      int owned = jdbc.queryForObject(
        "select count(*) from media_assets where id=? and owner_id=?", Integer.class, assetId, workerId);
      if (owned != 1)
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Resolution image is not owned by worker");
      jdbc.update(
        "insert into complaint_media(complaint_id,asset_id,kind) select complaint_id,?,'AFTER' from task_complaints where task_id=?",
        assetId, taskId);
    }
    jdbc.update(
      "update complaints set status='CLEANUP_SUBMITTED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id",
      taskId);
    audit(workerId, "RESOLUTION_SUBMITTED", "TASK", taskId);
  }

  @Transactional
  public void reviewResolution(UUID taskId, UUID supervisorId, boolean accepted) {
    int updated = jdbc.update(
      "update tasks set status=?,updated_at=now() where id=? and status='RESOLUTION_SUBMITTED'",
      accepted ? "COMPLETED" : "REWORK_REQUIRED", taskId);
    if (updated != 1)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Task is not awaiting review");
    jdbc.update(
      "update complaints set status=?,updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id",
      accepted ? "CLOSED" : "IN_PROGRESS", taskId);
    audit(supervisorId, accepted ? "RESOLUTION_ACCEPTED" : "RESOLUTION_REJECTED", "TASK", taskId);
  }

  // ── Admin cancellation ─────────────────────────────────────────────

  /** Admin-only: cancel a corrupted or misaligned task and return its complaints to VERIFIED. */
  @Transactional
  public void cancel(UUID taskId, UUID adminId, String reason) {
    String cleanedReason = reason == null || reason.isBlank() ? null : reason.trim();
    int updated = jdbc.update(
      "update tasks set status='CANCELLED',cancellation_reason=?,updated_at=now() where id=? and status not in ('COMPLETED','CANCELLED')",
      cleanedReason, taskId);
    if (updated != 1)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Task cannot be cancelled");
    jdbc.update(
      "update complaints set status='VERIFIED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id",
      taskId);
    audit(adminId, "TASK_CANCELLED", "TASK", taskId);
  }

  // ── Private helpers ────────────────────────────────────────────────

  private String taskSelect() {
    return """
      select t.id,t.status,t.priority,t.due_at,t.queued_for_at,t.resolution_note,t.cancellation_reason,
             ST_AsGeoJSON(g.boundary::geometry) boundary,
             t.assigned_worker_id,t.queued_worker_id,aw.full_name assigned_worker_name,qw.full_name queued_worker_name
      from tasks t join geofences g on g.id=t.geofence_id
      left join app_users aw on aw.id=t.assigned_worker_id
      left join app_users qw on qw.id=t.queued_worker_id
      """;
  }

  private TaskDetail taskDetail(TaskView task) {
    Map<UUID, List<TaskMedia>> mediaByComplaint = new HashMap<>();
    jdbc.query("""
      select tc.complaint_id,m.id,m.original_name,m.content_type,m.size_bytes,cm.kind
      from task_complaints tc
      join complaint_media cm on cm.complaint_id=tc.complaint_id
      join media_assets m on m.id=cm.asset_id
      where tc.task_id=?
      order by tc.complaint_id,case cm.kind when 'BEFORE' then 1 else 2 end,m.created_at
      """, rs -> {
        UUID complaintId = UUID.fromString(rs.getString("complaint_id"));
        mediaByComplaint.computeIfAbsent(complaintId, unused -> new ArrayList<>()).add(new TaskMedia(
          UUID.fromString(rs.getString("id")), rs.getString("original_name"), rs.getString("content_type"),
          rs.getLong("size_bytes"), rs.getString("kind")));
      }, task.id());
    List<TaskComplaint> complaints = jdbc.query("""
      select c.id,c.status,c.description,ST_Y(c.location::geometry) latitude,ST_X(c.location::geometry) longitude,
             c.ai_severity,c.created_at
      from task_complaints tc join complaints c on c.id=tc.complaint_id
      where tc.task_id=? order by c.created_at
      """, (rs, row) -> {
        UUID complaintId = UUID.fromString(rs.getString("id"));
        return new TaskComplaint(complaintId, rs.getString("status"), rs.getString("description"),
          rs.getDouble("latitude"), rs.getDouble("longitude"), rs.getString("ai_severity"),
          rs.getTimestamp("created_at").toInstant(),
          List.copyOf(mediaByComplaint.getOrDefault(complaintId, List.of())));
      }, task.id());
    return new TaskDetail(task, complaints);
  }

  private void createGeofence(UUID geofenceId, List<UUID> complaintIds, List<Coordinate> boundary) {
    if (boundary != null && !boundary.isEmpty()) {
      jdbc.update("insert into geofences(id,boundary) values (?,ST_GeogFromText(?))", geofenceId, toWkt(boundary));
      return;
    }
    int created = jdbc.update(
      "insert into geofences(id,boundary) select ?,ST_Buffer(location,50) from complaints where id=?",
      geofenceId, complaintIds.get(0));
    if (created != 1)
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint location is unavailable");
  }

  private void lockAndValidateWorker(UUID workerId) {
    if (!lockWorker(workerId) || !isEligibleWorker(workerId))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");
  }

  private boolean lockWorker(UUID workerId) {
    return !jdbc.query("select id from app_users where id=? for update",
      (rs, row) -> rs.getString("id"), workerId).isEmpty();
  }

  private UUID lockFirstFreeWorker() {
    List<UUID> workers = jdbc.query("""
      select u.id from app_users u
      where u.role='WORKER' and u.active=true
      and not exists (
        select 1 from tasks t where t.assigned_worker_id=u.id
          and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
      )
      order by u.full_name,u.id
      limit 1 for update skip locked
      """, (rs, row) -> UUID.fromString(rs.getString("id")));
    return workers.isEmpty() ? null : workers.get(0);
  }

  private UUID lockPreferredFreeWorker(UUID workerId) {
    List<UUID> workers = jdbc.query("""
      select u.id from app_users u
      where u.id=? and u.role='WORKER' and u.active=true
      and not exists (
        select 1 from tasks t where t.assigned_worker_id=u.id
          and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
      )
      for update skip locked
      """, (rs, row) -> UUID.fromString(rs.getString("id")), workerId);
    return workers.isEmpty() ? null : workers.get(0);
  }

  private boolean isEligibleWorker(UUID workerId) {
    Integer count = jdbc.queryForObject(
      "select count(*) from app_users where id=? and role='WORKER' and active=true", Integer.class, workerId);
    return count != null && count == 1;
  }

  private boolean isWorkerFree(UUID workerId) {
    Integer count = jdbc.queryForObject(
      "select count(*) from tasks where assigned_worker_id=? and status in (" + ACTIVE_WORK_SQL + ")",
      Integer.class, workerId);
    return count != null && count == 0;
  }

  private boolean hasQueuedTask(UUID workerId) {
    Integer count = jdbc.queryForObject(
      "select count(*) from tasks where queued_worker_id=? and status='QUEUED'", Integer.class, workerId);
    return count != null && count > 0;
  }

  private boolean dwellEvidence(UUID taskId, UUID workerId) {
    Integer count = jdbc.queryForObject("""
      select count(*) from worker_locations l
      join tasks t on t.id=l.task_id
      join geofences g on g.id=t.geofence_id
      where l.task_id=? and l.worker_id=? and l.recorded_at > now() - interval '90 seconds'
      and ST_Covers(g.boundary::geometry, l.point::geometry)
      """, Integer.class, taskId, workerId);
    return count != null && count >= 2;
  }

  private TaskView view(ResultSet rs) throws SQLException {
    return new TaskView(
      UUID.fromString(rs.getString("id")),
      rs.getString("status"),
      rs.getString("priority"),
      rs.getTimestamp("due_at") == null ? null : rs.getTimestamp("due_at").toInstant(),
      rs.getTimestamp("queued_for_at") == null ? null : rs.getTimestamp("queued_for_at").toInstant(),
      rs.getString("resolution_note"),
      rs.getString("boundary"),
      nullableUuid(rs, "assigned_worker_id"),
      nullableUuid(rs, "queued_worker_id"),
      rs.getString("assigned_worker_name"),
      rs.getString("queued_worker_name"),
      rs.getString("cancellation_reason")
    );
  }

  private static UUID nullableUuid(ResultSet rs, String column) throws SQLException {
    String value = rs.getString(column);
    return value == null ? null : UUID.fromString(value);
  }

  private String toWkt(List<Coordinate> boundary) {
    if (boundary.size() < 3)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geofence needs at least 3 points");
    List<Coordinate> points = new ArrayList<>(boundary);
    Coordinate first = points.get(0), last = points.get(points.size() - 1);
    if (first.longitude() != last.longitude() || first.latitude() != last.latitude())
      points.add(first);
    String coordinates = points.stream()
      .map(p -> p.longitude() + " " + p.latitude())
      .reduce((a, b) -> a + "," + b).orElseThrow();
    return "POLYGON((" + coordinates + "))";
  }

  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)",
      actorId, action, entityType, entityId);
  }

  // ── Records & Enums ────────────────────────────────────────────────

  public enum TaskStatus {
    AWAITING_ASSIGNMENT, QUEUED, ASSIGNED, ACCEPTED, ON_SITE,
    RESOLUTION_SUBMITTED, REWORK_REQUIRED, COMPLETED, CANCELLED
  }

  public enum AssignmentMode {
    IMMEDIATE(0), QUEUE_2_HOURS(2), QUEUE_3_HOURS(3);
    private final int delayHours;
    AssignmentMode(int delayHours) { this.delayHours = delayHours; }
    public int delayHours() { return delayHours; }
  }

  public record Coordinate(double latitude, double longitude) { }

  public record CreateTask(UUID workerId, AssignmentMode assignmentMode, String priority,
                           Instant dueAt, List<UUID> complaintIds, List<Coordinate> boundary) { }

  public record WorkerAvailability(UUID id, String fullName, String email, String availability,
                                   int activeTaskCount, int queuedTaskCount) { }

  public record LocationResult(boolean insideGeofence, boolean entryConfirmed, String taskStatus) { }

  public record TaskView(UUID id, String status, String priority, Instant dueAt, Instant queuedForAt,
                         String resolutionNote, String boundaryGeoJson, UUID assignedWorkerId,
                         UUID queuedWorkerId, String assignedWorkerName, String queuedWorkerName,
                         String cancellationReason) { }

  public record TaskMedia(UUID id, String filename, String contentType, long sizeBytes, String kind) { }

  public record TaskComplaint(UUID id, String status, String description, double latitude, double longitude,
                              String severity, Instant createdAt, List<TaskMedia> media) { }

  public record TaskDetail(TaskView task, List<TaskComplaint> complaints) { }

  private record QueuedTask(UUID taskId, UUID workerId) { }
}
