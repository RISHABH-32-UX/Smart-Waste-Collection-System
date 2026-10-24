package com.capstone.smartwaste.complaint;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ComplaintService {
  private final JdbcTemplate jdbc;
  public ComplaintService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @Transactional
  public ComplaintView create(UUID citizenId, CreateComplaint request) {
    UUID id = UUID.randomUUID();
    jdbc.update("""
        insert into complaints(id,citizen_id,status,description,location)
        values (?,?,'PENDING_VERIFICATION',?, ST_SetSRID(ST_MakePoint(?,?),4326)::geography)
        """, id, citizenId, request.description(), request.longitude(), request.latitude());
    for (UUID assetId : request.beforeAssetIds()) {
      int owned = jdbc.queryForObject("select count(*) from media_assets where id=? and owner_id=?", Integer.class, assetId, citizenId);
      if (owned != 1) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Image is not owned by current user");
      jdbc.update("insert into complaint_media(complaint_id,asset_id,kind) values (?,?,'BEFORE')", id, assetId);
    }
    audit(citizenId, "COMPLAINT_CREATED", "COMPLAINT", id);
    return find(id, citizenId, false);
  }

  public List<ComplaintView> listMine(UUID citizenId) {
    return jdbc.query("""
      select id,status,description,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,
             ai_severity,created_at,updated_at from complaints where citizen_id=? order by created_at desc
      """, (rs, row) -> view(rs), citizenId);
  }

  public List<ComplaintView> verificationQueue() {
    return jdbc.query("""
      select id,status,description,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,
             ai_severity,created_at,updated_at from complaints
      where status='PENDING_VERIFICATION' order by created_at asc
      """, (rs, row) -> view(rs));
  }

  /** Verified complaints remain here until the supervisor assigns or queues a task. */
  public List<ComplaintView> assignmentReady() {
    return jdbc.query("""
      select id,status,description,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,
             ai_severity,created_at,updated_at from complaints
      where status='VERIFIED' order by created_at asc
      """, (rs, row) -> view(rs));
  }

  public ComplaintView find(UUID id, UUID actorId, boolean privileged) {
    List<ComplaintView> rows = jdbc.query("""
      select id,status,description,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,
             ai_severity,created_at,updated_at from complaints where id=? and (? or citizen_id=?)
      """, (rs, row) -> view(rs), id, privileged, actorId);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
    return rows.get(0);
  }

  @Transactional
  public ComplaintView verify(UUID complaintId, UUID supervisorId, boolean approved, String severity) {
    int updated = jdbc.update("update complaints set status=?,ai_severity=coalesce(?,ai_severity),updated_at=now(),version=version+1 where id=? and status='PENDING_VERIFICATION'",
      approved ? "VERIFIED" : "REJECTED", severity, complaintId);
    if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Complaint is no longer awaiting verification");
    audit(supervisorId, approved ? "COMPLAINT_APPROVED" : "COMPLAINT_REJECTED", "COMPLAINT", complaintId);
    return find(complaintId, supervisorId, true);
  }

  private ComplaintView view(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new ComplaintView(UUID.fromString(rs.getString("id")), rs.getString("status"), rs.getString("description"),
      rs.getDouble("latitude"), rs.getDouble("longitude"), rs.getString("ai_severity"),
      rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
  }
  private void audit(UUID actorId, String action, String entityType, UUID entityId) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id) values(?,?,?,?)", actorId, action, entityType, entityId);
  }
  public record CreateComplaint(String description, double latitude, double longitude, List<UUID> beforeAssetIds) { }
  public record ComplaintView(UUID id, String status, String description, double latitude, double longitude,
                              String severity, Instant createdAt, Instant updatedAt) { }
}
