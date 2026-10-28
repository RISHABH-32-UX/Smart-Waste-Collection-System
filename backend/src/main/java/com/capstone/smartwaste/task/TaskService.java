package com.capstone.smartwaste.task;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
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

  // Rest of the class content

  @Transactional
  public LocationResult recordLocation(UUID taskId, UUID workerId, LocationEvent request) {
    Double accuracy = request.accuracyMeters();
    Instant capturedAt = request.getCapturedAt();
    double latitude = request.latitude();
    double longitude = request.longitude();

    if (accuracy == null || accuracy < 0 || accuracy > 100) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location accuracy is invalid");
    }

    System.out.println("Received location: lat=" + latitude + ", lon=" + longitude + ", taskId=" + taskId + ", workerId=" + workerId);

    Integer taskCount = jdbc.queryForObject("select count(*) from tasks where id=? and assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE')", Integer.class, taskId, workerId);
    if (taskCount == null || taskCount != 1) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task is not active for this worker");

    Boolean inside = jdbc.queryForObject("""
      select ST_Covers(g.boundary::geometry, ST_SetSRID(ST_MakePoint(?,?),4326)::geometry)
      from tasks t join geofences g on g.id=t.geofence_id where t.id=? and g.active=true
      """, Boolean.class, longitude, latitude, taskId);

    double accuracyValue = accuracy != null ? accuracy : 0;
    jdbc.update("insert into worker_locations(task_id,worker_id,point,accuracy_meters,recorded_at) values(?,?,ST_SetSRID(ST_MakePoint(?,?),4326)::geography,?,?)", ps -> {
      ps.setObject(1, taskId);
      ps.setObject(2, workerId);
      ps.setObject(3, longitude);
      ps.setObject(4, latitude);
      ps.setObject(5, accuracyValue);
      ps.setObject(6, capturedAt != null ? capturedAt : Instant.now(), Types.TIMESTAMP);
    });

    boolean trustworthy = accuracyValue <= 50;
    boolean entryConfirmed = trustworthy && Boolean.TRUE.equals(inside) && dwellEvidence(taskId, workerId);
    if (entryConfirmed) {
      jdbc.update("update tasks set status='ON_SITE',updated_at=now() where id=? and status in ('ASSIGNED','ACCEPTED')", taskId);
      jdbc.update("update complaints set status='IN_PROGRESS',updated_at=now() from task_complaints tc where tc.task_id=? and tc.complaint_id=complaints.id and complaints.status='ASSIGNED'", taskId);
      audit(workerId, "GEOFENCE_ENTERED", "TASK", taskId);
    }
    return new LocationResult(Boolean.TRUE.equals(inside), entryConfirmed, get(taskId, workerId, false).status());
  }

  // Rest of the class methods

  private boolean dwellEvidence(UUID taskId, UUID workerId) {
    Integer count = jdbc.queryForObject("""
      select count(*) from worker_locations l join tasks t on t.id=l.task_id join geofences g on g.id=t.geofence_id
      where l.task_id=? and l.worker_id=? and l.recorded_at > now() - interval '90 seconds'
      and ST_Covers(g.boundary::geometry, l.point::geometry)
      """, Integer.class, taskId, workerId);
    return count != null && count >= 2;
  }

  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
  }

  private TaskView get(UUID taskId, UUID actorId, boolean privileged) {
    List<TaskView> tasks = jdbc.query(taskSelect() + " where t.id=? and (? or t.assigned_worker_id=?)", (rs,row) -> view(rs), taskId, privileged, actorId);
    if (tasks.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
    return tasks.get(0);
  }

  private boolean isWorkerFree(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')", Integer.class, workerId);
    return count != null && count == 0;
  }

  private boolean hasQueuedTask(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where queued_worker_id=? and status='QUEUED'", Integer.class, workerId);
    return count != null && count > 0;
  }

  private boolean isEligibleWorker(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from app_users where id=? and role='WORKER' and active=true", Integer.class, workerId);
    return count != null && count == 1;
  }

  private boolean lockWorker(UUID workerId) { return !jdbc.query("select id from app_users where id=? for update", (rs, row) -> rs.getString("id"), workerId).isEmpty(); }

  private UUID lockFirstFreeWorker() {
    List<UUID> workers = jdbc.query("""
      select u.id from app_users u
      where u.role='WORKER' and u.active=true
      and not exists (
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
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
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
      )
      for update skip locked
      """, (rs, row) -> UUID.fromString(rs.getString("id")), workerId);
    return workers.isEmpty() ? null : workers.get(0);
  }

  private void lockAndValidateWorker(UUID workerId) {
    if (!lockWorker(workerId) || !isEligibleWorker(workerId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");
  }

  private String toWkt(List<Coordinate> boundary) {
    if (boundary.size() < 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geofence needs at least 3 points");
    List<Coordinate> points = new ArrayList<>(boundary); Coordinate first = points.get(0), last = points.get(points.size() - 1);
    if (first.longitude() != last.longitude() || first.latitude() != last.latitude()) points.add(first);
    String coordinates = points.stream().map(p -> p.longitude() + " " + p.latitude()).reduce((a,b) -> a + "," + b).orElseThrow();
    return "POLYGON((" + coordinates + "))";
  }

  private void createGeofence(UUID geofenceId, List<UUID> complaintIds, List<Coordinate> boundary) {
    if (boundary != null && !boundary.isEmpty()) {
      jdbc.update("insert into geofences(id,boundary) values (?,ST_GeogFromText(?))", geofenceId, toWkt(boundary));
      return;
    }
    int created = jdbc.update("insert into geofences(id,boundary) select ?,ST_Buffer(location,50) from complaints where id=?", geofenceId, complaintIds.get(0));
    if (created != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint location is unavailable");
  }

  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
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
    String value = rs.getString(column); return value == null ? null : UUID.fromString(value);
  }

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

  private String toWkt(List<Coordinate> boundary) {
    if (boundary.size() < 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geofence needs at least 3 points");
    List<Coordinate> points = new ArrayList<>(boundary); Coordinate first = points.get(0), last = points.get(points.size() - 1);
    if (first.longitude() != last.longitude() || first.latitude() != last.latitude()) points.add(first);
    String coordinates = points.stream().map(p -> p.longitude() + " " + p.latitude()).reduce((a,b) -> a + "," + b).orElseThrow();
    return "POLYGON((" + coordinates + "))";
  }

  private void createGeofence(UUID geofenceId, List<UUID> complaintIds, List<Coordinate> boundary) {
    if (boundary != null && !boundary.isEmpty()) {
      jdbc.update("insert into geofences(id,boundary) values (?,ST_GeogFromText(?))", geofenceId, toWkt(boundary));
      return;
    }
    int created = jdbc.update("insert into geofences(id,boundary) select ?,ST_Buffer(location,50) from complaints where id=?", geofenceId, complaintIds.get(0));
    if (created != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint location is unavailable");
  }

  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
  }

  private boolean isWorkerFree(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')", Integer.class, workerId);
    return count != null && count == 0;
  }

  private boolean hasQueuedTask(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where queued_worker_id=? and status='QUEUED'", Integer.class, workerId);
    return count != null && count > 0;
  }

  private boolean isEligibleWorker(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from app_users where id=? and role='WORKER' and active=true", Integer.class, workerId);
    return count != null && count == 1;
  }

  private boolean lockWorker(UUID workerId) { return !jdbc.query("select id from app_users where id=? for update", (rs, row) -> rs.getString("id"), workerId).isEmpty(); }

  private UUID lockFirstFreeWorker() {
    List<UUID> workers = jdbc.query("""
      select u.id from app_users u
      where u.role='WORKER' and u.active=true
      and not exists (
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
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
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
      )
      for update skip locked
      """, (rs, row) -> UUID.fromString(rs.getString("id")), workerId);
    return workers.isEmpty() ? null : workers.get(0);
  }

  private void lockAndValidateWorker(UUID workerId) {
    if (!lockWorker(workerId) || !isEligibleWorker(workerId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");
  }

  private boolean dwellEvidence(UUID taskId, UUID workerId) {
    Integer count = jdbc.queryForObject("""
      select count(*) from worker_locations l join tasks t on t.id=l.task_id join geofences g on g.id=t.geofence_id
      where l.task_id=? and l.worker_id=? and l.recorded_at > now() - interval '90 seconds'
      and ST_Covers(g.boundary::geometry, l.point::geometry)
      """, Integer.class, taskId, workerId);
    return count != null && count >= 2;
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
          rs.getTimestamp("created_at").toInstant(), List.copyOf(mediaByComplaint.getOrDefault(complaintId, List.of())));
      }, task.id());
    return new TaskDetail(task, complaints);
  }

  public record TaskMedia(UUID id, String filename, String contentType, long sizeBytes, String kind) { }

  public record TaskComplaint(UUID id, String status, String description, double latitude, double longitude,
                              String severity, Instant createdAt, List<TaskMedia> media) { }

  public record TaskDetail(TaskView task, List<TaskComplaint> complaints) { }

  private boolean dwellEvidence(UUID taskId, UUID workerId) {
    Integer count = jdbc.queryForObject("""
      select count(*) from worker_locations l join tasks t on t.id=l.task_id join geofences g on g.id=t.geofence_id
      where l.task_id=? and l.worker_id=? and l.recorded_at > now() - interval '90 seconds'
      and ST_Covers(g.boundary::geometry, l.point::geometry)
      """, Integer.class, taskId, workerId);
    return count != null && count >= 2;
  }

  private boolean isWorkerFree(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where assigned_worker_id=? and status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')", Integer.class, workerId);
    return count != null && count == 0;
  }

  private boolean hasQueuedTask(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from tasks where queued_worker_id=? and status='QUEUED'", Integer.class, workerId);
    return count != null && count > 0;
  }

  private boolean isEligibleWorker(UUID workerId) {
    Integer count = jdbc.queryForObject("select count(*) from app_users where id=? and role='WORKER' and active=true", Integer.class, workerId);
    return count != null && count == 1;
  }

  private boolean lockWorker(UUID workerId) { return !jdbc.query("select id from app_users where id=? for update", (rs, row) -> rs.getString("id"), workerId).isEmpty(); }

  private UUID lockFirstFreeWorker() {
    List<UUID> workers = jdbc.query("""
      select u.id from app_users u
      where u.role='WORKER' and u.active=true
      and not exists (
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
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
        select 1 from tasks t where t.assigned_worker_id=u.id and t.status in ('ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED')
      )
      for update skip locked
      """, (rs, row) -> UUID.fromString(rs.getString("id")), workerId);
    return workers.isEmpty() ? null : workers.get(0);
  }

  private void lockAndValidateWorker(UUID workerId) {
    if (!lockWorker(workerId) || !isEligibleWorker(workerId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an active worker");
  }

  private String toWkt(List<Coordinate> boundary) {
    if (boundary.size() < 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geofence needs at least 3 points");
    List<Coordinate> points = new ArrayList<>(boundary); Coordinate first = points.get(0), last = points.get(points.size() - 1);
    if (first.longitude() != last.longitude() || first.latitude() != last.latitude()) points.add(first);
    String coordinates = points.stream().map(p -> p.longitude() + " " + p.latitude()).reduce((a,b) -> a + "," + b).orElseThrow();
    return "POLYGON((" + coordinates + "))";
  }

  private void createGeofence(UUID geofenceId, List<UUID> complaintIds, List<Coordinate> boundary) {
    if (boundary != null && !boundary.isEmpty()) {
      jdbc.update("insert into geofences(id,boundary) values (?,ST_GeogFromText(?))", geofenceId, toWkt(boundary));
      return;
    }
    int created = jdbc.update("insert into geofences(id,boundary) select ?,ST_Buffer(location,50) from complaints where id=?", geofenceId, complaintIds.get(0));
    if (created != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint location is unavailable");
  }

  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
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
    String value = rs.getString(column); return value == null ? null : UUID.fromString(value);
  }

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
    String value = rs.getString(column); return value == null ? null : UUID.fromString(value);
  }

  public record LocationResult(boolean insideGeofence, boolean entryConfirmed, String taskStatus) { }

  public record TaskView(UUID id, String status, String priority, Instant dueAt, Instant queuedForAt, String resolutionNote,
                         String boundaryGeoJson, UUID assignedWorkerId, UUID queuedWorkerId, String assignedWorkerName,
                         String queuedWorkerName, String cancellationReason) { }

  public record LocationEvent(double latitude, double longitude, Double accuracyMeters, String capturedAt) implements com.capstone.smartwaste.task.LocationEvent {
    @Override
    public Instant getCapturedAt() {
        try {
            return capturedAt != null ? Instant.parse(capturedAt) : Instant.now();
        } catch (Exception e) {
            System.out.println("Invalid timestamp format, using current time: " + Instant.now());
            return Instant.now();
        }
    }
}

  public enum TaskStatus {
    AWAITING_ASSIGNMENT, QUEUED, ASSIGNED, ACCEPTED, ON_SITE, RESOLUTION_SUBMITTED, REWORK_REQUIRED, COMPLETED, CANCELLED;
  }

  public enum AssignmentMode {
    IMMEDIATE(0), QUEUE_2_HOURS(2), QUEUE_3_HOURS(3);
    private final int delayHours; AssignmentMode(int delayHours) { this.delayHours = delayHours; }
    public int delayHours() { return delayHours; }
  }

  public record Coordinate(double latitude, double longitude) { }

  public record CreateTask(UUID workerId, AssignmentMode assignmentMode, String priority, Instant dueAt, List<UUID> complaintIds, List<Coordinate> boundary) { }

  public record WorkerAvailability(UUID id, String fullName, String email, String availability, int activeTaskCount, int queuedTaskCount) { }
}