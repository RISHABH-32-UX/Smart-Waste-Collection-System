package com.capstone.smartwaste.task;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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

  /** Assign only a free worker; queue modes reserve a future slot on a busy worker. */
  @Transactional
  public TaskView create(UUID supervisorId, CreateTask request) {
    if (request.complaintIds().isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one complaint is required");
    if (request.workerId() == null || request.assignmentMode() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a worker and assignment mode");

    lockAndValidateWorker(request.workerId());
    boolean workerFree = isWorkerFree(request.workerId());
    boolean queued = request.assignmentMode() != AssignmentMode.IMMEDIATE;
    if (!queued && !workerFree) throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected worker has an active task. Choose a free worker or queue this task.");
    if (queued && workerFree) throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected worker is free. Assign the task immediately instead of queueing it.");
    if (queued && hasQueuedTask(request.workerId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected worker already has a queued task. Choose another busy worker.");

    UUID geofenceId = UUID.randomUUID();
    createGeofence(geofenceId, request.complaintIds(), request.boundary());
    UUID taskId = UUID.randomUUID();
    Instant queuedFor = queued ? Instant.now().plus(Duration.ofHours(request.assignmentMode().delayHours())) : null;
    jdbc.update("""
      insert into tasks(id,geofence_id,assigned_worker_id,queued_worker_id,status,priority,due_at,queued_for_at)
      values (?,?,?,?,?,?,?,?)
      """, taskId, geofenceId, queued ? null : request.workerId(), queued ? request.workerId() : null,
      queued ? "QUEUED" : "ASSIGNED", request.priority(), request.dueAt(), queuedFor);

    String complaintStatus = queued ? "ASSIGNMENT_QUEUED" : "ASSIGNED";
    for (UUID complaintId : request.complaintIds()) {
      int changed = jdbc.update("update complaints set status=?,updated_at=now(),version=version+1 where id=? and status='VERIFIED'", complaintStatus, complaintId);
      if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Complaint must be verified and unassigned before task allocation");
      jdbc.update("insert into task_complaints(task_id,complaint_id) values(?,?)", taskId, complaintId);
    }
    audit(supervisorId, queued ? "TASK_QUEUED" : "TASK_ASSIGNED", "TASK", taskId);
    return get(taskId, supervisorId, true);
  }

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
        return new WorkerAvailability(UUID.fromString(rs.getString("id")), rs.getString("full_name"), rs.getString("email"),
          active == 0 ? "FREE" : "BUSY", active, rs.getInt("queued_task_count"));
      });
  }

  public List<TaskView> assignmentQueue() {
    return jdbc.query(taskSelect() + " where t.status in ('QUEUED','AWAITING_ASSIGNMENT') order by t.queued_for_at nulls last, t.created_at",
      (rs, row) -> view(rs));
  }

  public List<TaskView> workerTasks(UUID workerId) {
    return jdbc.query(taskSelect() + " where t.assigned_worker_id=? and t.status not in ('COMPLETED','CANCELLED') "
        + "order by case t.priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3 else 4 end, t.due_at nulls last",
      (rs,row) -> view(rs), workerId);
  }

  public TaskView get(UUID taskId, UUID actorId, boolean privileged) {
    List<TaskView> tasks = jdbc.query(taskSelect() + " where t.id=? and (? or t.assigned_worker_id=?)", (rs,row) -> view(rs), taskId, privileged, actorId);
    if (tasks.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
    return tasks.get(0);
  }

  /** Called every minute. A queued task is assigned only after its scheduled time and only if its reserved worker is free. */
  @Transactional
  public int assignDueQueuedTasks() {
    List<QueuedTask> dueTasks = jdbc.query("""
      select id,queued_worker_id from tasks
      where status='QUEUED' and queued_for_at <= now()
      order by queued_for_at
      for update skip locked
      """, (rs, row) -> new QueuedTask(UUID.fromString(rs.getString("id")), nullableUuid(rs, "queued_worker_id")));
    int assigned = 0;
    for (QueuedTask queued : dueTasks) {
      if (queued.workerId() == null || !lockWorker(queued.workerId()) || !isEligibleWorker(queued.workerId())) {
        jdbc.update("update tasks set status='AWAITING_ASSIGNMENT',queued_worker_id=null,queued_for_at=null,updated_at=now() where id=?", queued.taskId());
        jdbc.update("update complaints set status='VERIFIED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id", queued.taskId());
        audit(null, "QUEUE_WORKER_UNAVAILABLE", "TASK", queued.taskId());
      } else if (isWorkerFree(queued.workerId())) {
        jdbc.update("update tasks set assigned_worker_id=?,queued_worker_id=null,queued_for_at=null,status='ASSIGNED',updated_at=now() where id=? and status='QUEUED'", queued.workerId(), queued.taskId());
        jdbc.update("update complaints set status='ASSIGNED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNMENT_QUEUED'", queued.taskId());
        audit(null, "QUEUED_TASK_AUTO_ASSIGNED", "TASK", queued.taskId());
        assigned++;
      } else {
        // Delay further rather than assigning two active jobs to one worker.
        jdbc.update("update tasks set queued_for_at=now() + interval '15 minutes',updated_at=now() where id=?", queued.taskId());
        audit(null, "QUEUED_TASK_DELAYED", "TASK", queued.taskId());
      }
    }
    return assigned;
  }

  @Transactional
  public LocationResult recordLocation(UUID taskId, UUID workerId, LocationEvent request) {
    if (request.accuracyMeters() > 50 || request.capturedAt().isBefore(Instant.now().minus(Duration.ofMinutes(2))) || request.capturedAt().isAfter(Instant.now().plusSeconds(30)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location accuracy or timestamp is invalid");
    Integer taskCount = jdbc.queryForObject("select count(*) from tasks where id=? and assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE')", Integer.class, taskId, workerId);
    if (taskCount == null || taskCount != 1) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task is not active for this worker");
    Boolean inside = jdbc.queryForObject("""
      select ST_Covers(g.boundary::geometry, ST_SetSRID(ST_MakePoint(?,?),4326))
      from tasks t join geofences g on g.id=t.geofence_id where t.id=? and g.active=true
      """, Boolean.class, request.longitude(), request.latitude(), taskId);
    jdbc.update("insert into worker_locations(task_id,worker_id,point,accuracy_meters,recorded_at) values(?,?,ST_SetSRID(ST_MakePoint(?,?),4326)::geography,?,?)", taskId, workerId, request.longitude(), request.latitude(), request.accuracyMeters(), request.capturedAt());
    boolean entryConfirmed = Boolean.TRUE.equals(inside) && dwellEvidence(taskId, workerId);
    if (entryConfirmed) {
      jdbc.update("update tasks set status='ON_SITE',updated_at=now() where id=? and status in ('ASSIGNED','ACCEPTED')", taskId);
      jdbc.update("update complaints set status='IN_PROGRESS',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNED'", taskId);
      audit(workerId, "GEOFENCE_ENTERED", "TASK", taskId);
    }
    return new LocationResult(Boolean.TRUE.equals(inside), entryConfirmed, get(taskId, workerId, false).status());
  }

  @Transactional
  public void submitResolution(UUID taskId, UUID workerId, List<UUID> afterAssets, String note) {
    int updated = jdbc.update("update tasks set status='RESOLUTION_SUBMITTED',updated_at=now() where id=? and assigned_worker_id=? and status='ON_SITE'", taskId, workerId);
    if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Task must be on site before submitting resolution");
    for (UUID assetId : afterAssets) {
      int owned = jdbc.queryForObject("select count(*) from media_assets where id=? and owner_id=?", Integer.class, assetId, workerId);
      if (owned != 1) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Resolution image is not owned by worker");
      jdbc.update("insert into complaint_media(complaint_id,asset_id,kind) select complaint_id,?,'AFTER' from task_complaints where task_id=?", assetId, taskId);
    }
    jdbc.update("update complaints set status='CLEANUP_SUBMITTED',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id", taskId);
    audit(workerId, "RESOLUTION_SUBMITTED", "TASK", taskId);
  }

  @Transactional
  public void reviewResolution(UUID taskId, UUID supervisorId, boolean accepted) {
    int updated = jdbc.update("update tasks set status=?,updated_at=now() where id=? and status='RESOLUTION_SUBMITTED'", accepted ? "COMPLETED" : "REWORK_REQUIRED", taskId);
    if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Task is not awaiting review");
    jdbc.update("update complaints set status=?,updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id", accepted ? "CLOSED" : "IN_PROGRESS", taskId);
    audit(supervisorId, accepted ? "RESOLUTION_ACCEPTED" : "RESOLUTION_REJECTED", "TASK", taskId);
  }

  private String taskSelect() {
    return """
      select t.id,t.status,t.priority,t.due_at,t.queued_for_at,ST_AsGeoJSON(g.boundary::geometry) boundary,
             t.assigned_worker_id,t.queued_worker_id,aw.full_name assigned_worker_name,qw.full_name queued_worker_name
      from tasks t join geofences g on g.id=t.geofence_id
      left join app_users aw on aw.id=t.assigned_worker_id
      left join app_users qw on qw.id=t.queued_worker_id
      """;
  }

  private void createGeofence(UUID geofenceId, List<UUID> complaintIds, List<Coordinate> boundary) {
    if (boundary != null && !boundary.isEmpty()) {
      jdbc.update("insert into geofences(id,boundary) values (?,ST_GeogFromText(?))", geofenceId, toWkt(boundary));
      return;
    }
    int created = jdbc.update("insert into geofences(id,boundary) select ?,ST_Buffer(location,50) from complaints where id=?", geofenceId, complaintIds.get(0));
    if (created != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint location is unavailable");
  }

  private void lockAndValidateWorker(UUID workerId) {
    if (!lockWorker(workerId) || !isEligibleWorker(workerId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");
  }
  private boolean lockWorker(UUID workerId) { return !jdbc.query("select id from app_users where id=? for update", (rs, row) -> rs.getString("id"), workerId).isEmpty(); }
  private boolean isEligibleWorker(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from app_users where id=? and role='WORKER' and active=true", Integer.class, workerId);
    return count != null && count == 1;
  }
  private boolean isWorkerFree(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where assigned_worker_id=? and status in (" + ACTIVE_WORK_SQL + ")", Integer.class, workerId);
    return count != null && count == 0;
  }
  private boolean hasQueuedTask(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where queued_worker_id=? and status='QUEUED'", Integer.class, workerId);
    return count != null && count > 0;
  }
  private boolean dwellEvidence(UUID taskId, UUID workerId) {
    Integer count = jdbc.queryForObject("""
      select count(*) from worker_locations l join tasks t on t.id=l.task_id join geofences g on g.id=t.geofence_id
      where l.task_id=? and l.worker_id=? and l.recorded_at > now() - interval '90 seconds'
      and ST_Covers(g.boundary::geometry, l.point::geometry)
      """, Integer.class, taskId, workerId);
    return count != null && count >= 2;
  }
  private TaskView view(ResultSet rs) throws SQLException {
    return new TaskView(UUID.fromString(rs.getString("id")), rs.getString("status"), rs.getString("priority"),
      rs.getTimestamp("due_at") == null ? null : rs.getTimestamp("due_at").toInstant(),
      rs.getTimestamp("queued_for_at") == null ? null : rs.getTimestamp("queued_for_at").toInstant(), rs.getString("boundary"),
      nullableUuid(rs, "assigned_worker_id"), nullableUuid(rs, "queued_worker_id"), rs.getString("assigned_worker_name"), rs.getString("queued_worker_name"));
  }
  private static UUID nullableUuid(ResultSet rs, String column) throws SQLException {
    String value = rs.getString(column); return value == null ? null : UUID.fromString(value);
  }
  private String toWkt(List<Coordinate> boundary) {
    if (boundary.size() < 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geofence needs at least 3 points");
    List<Coordinate> points = new ArrayList<>(boundary); Coordinate first = points.get(0), last = points.get(points.size() - 1);
    if (first.longitude() != last.longitude() || first.latitude() != last.latitude()) points.add(first);
    String coordinates = points.stream().map(p -> p.longitude() + " " + p.latitude()).reduce((a,b) -> a + "," + b).orElseThrow();
    return "POLYGON((" + coordinates + "))";
  }
  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
  }

  public enum AssignmentMode {
    IMMEDIATE(0), QUEUE_2_HOURS(2), QUEUE_3_HOURS(3);
    private final int delayHours; AssignmentMode(int delayHours) { this.delayHours = delayHours; }
    public int delayHours() { return delayHours; }
  }
  public record Coordinate(double latitude, double longitude) { }
  public record CreateTask(UUID workerId, AssignmentMode assignmentMode, String priority, Instant dueAt, List<UUID> complaintIds, List<Coordinate> boundary) { }
  public record WorkerAvailability(UUID id, String fullName, String email, String availability, int activeTaskCount, int queuedTaskCount) { }
  public record LocationEvent(double latitude, double longitude, double accuracyMeters, Instant capturedAt) { }
  public record LocationResult(boolean insideGeofence, boolean entryConfirmed, String taskStatus) { }
  public record TaskView(UUID id, String status, String priority, Instant dueAt, Instant queuedForAt, String boundaryGeoJson, UUID assignedWorkerId, UUID queuedWorkerId, String assignedWorkerName, String queuedWorkerName) { }
  private record QueuedTask(UUID taskId, UUID workerId) { }
}
