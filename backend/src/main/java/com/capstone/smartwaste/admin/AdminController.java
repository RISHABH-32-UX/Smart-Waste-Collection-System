package com.capstone.smartwaste.admin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminController {
  private final JdbcTemplate jdbc;
  public AdminController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping
  public List<UserView> users() {
    return jdbc.query("select id,email,full_name,phone,role,active,created_at from app_users where deleted_at is null order by created_at desc",
      (rs, row) -> new UserView(UUID.fromString(rs.getString("id")), rs.getString("email"), rs.getString("full_name"),
        rs.getString("phone"), rs.getString("role"), rs.getBoolean("active"), rs.getTimestamp("created_at").toInstant()));
  }

  @GetMapping("/analytics")
  public UserAnalytics analytics() {
    return jdbc.queryForObject("""
      select count(*) total_users,
             count(*) filter (where active) active_users,
             count(*) filter (where not active) revoked_users,
             count(*) filter (where role='CITIZEN') citizens,
             count(*) filter (where role='WORKER') workers,
             count(*) filter (where role='SUPERVISOR') supervisors,
             count(*) filter (where role='ADMIN') admins
      from app_users where deleted_at is null
      """, (rs, row) -> new UserAnalytics(rs.getLong("total_users"), rs.getLong("active_users"),
        rs.getLong("revoked_users"), rs.getLong("citizens"), rs.getLong("workers"),
        rs.getLong("supervisors"), rs.getLong("admins")));
  }

  @PutMapping("/{id}/role") @Transactional
  public UserView setRole(@AuthenticationPrincipal Jwt admin, @PathVariable UUID id, @RequestBody RoleRequest request) {
    UUID actorId = UUID.fromString(admin.getSubject());
    if (actorId.equals(id) && request.role() != Role.ADMIN)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators cannot remove their own admin role");
    UserView target = user(id);
    if (target.role().equals(Role.ADMIN.name()) && target.active() && request.role() != Role.ADMIN) ensureAnotherActiveAdmin(id);
    int changed = jdbc.update("update app_users set role=? where id=? and deleted_at is null", request.role().name(), id);
    if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    audit(actorId, "USER_ROLE_CHANGED", id, "role", request.role().name());
    return user(id);
  }

  @PatchMapping("/{id}/active") @Transactional
  public UserView setActive(@AuthenticationPrincipal Jwt admin, @PathVariable UUID id, @RequestBody ActiveRequest request) {
    UUID actorId = UUID.fromString(admin.getSubject());
    if (actorId.equals(id) && !request.active())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators cannot revoke their own account");
    UserView target = user(id);
    if (!request.active() && target.role().equals(Role.ADMIN.name()) && target.active()) ensureAnotherActiveAdmin(id);
    int changed = jdbc.update("update app_users set active=? where id=? and deleted_at is null", request.active(), id);
    if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    audit(actorId, request.active() ? "USER_ACCESS_RESTORED" : "USER_ACCESS_REVOKED", id, "active", request.active());
    return user(id);
  }

  /**
   * Historical complaints/tasks must retain their foreign keys and audit trail.
   * Deletion therefore removes the account from the active system and anonymizes its PII.
   */
  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
  public void delete(@AuthenticationPrincipal Jwt admin, @PathVariable UUID id) {
    UUID actorId = UUID.fromString(admin.getSubject());
    if (actorId.equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators cannot delete their own account");
    UserView target = user(id);
    if (target.role().equals(Role.ADMIN.name()) && target.active()) ensureAnotherActiveAdmin(id);
    String removedEmail = "deleted-" + id + "@deleted.invalid";
    String unusablePassword = new BCryptPasswordEncoder().encode(UUID.randomUUID().toString());
    int changed = jdbc.update("""
      update app_users set active=false,deleted_at=now(),email=?,full_name='Deleted user',phone=null,password_hash=?
      where id=? and deleted_at is null
      """, removedEmail, unusablePassword, id);
    if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    audit(actorId, "USER_DELETED_AND_ANONYMIZED", id, "anonymized", true);
  }

  private UserView user(UUID id) {
    return jdbc.query("select id,email,full_name,phone,role,active,created_at from app_users where id=? and deleted_at is null",
      (rs, row) -> new UserView(UUID.fromString(rs.getString("id")), rs.getString("email"), rs.getString("full_name"),
        rs.getString("phone"), rs.getString("role"), rs.getBoolean("active"), rs.getTimestamp("created_at").toInstant()), id)
      .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  private void ensureAnotherActiveAdmin(UUID targetId) {
    Integer otherAdmins = jdbc.queryForObject("select count(*) from app_users where role='ADMIN' and active=true and deleted_at is null and id<>?", Integer.class, targetId);
    if (otherAdmins == null || otherAdmins == 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "At least one active administrator must remain");
  }

  private void audit(UUID actorId, String action, UUID targetId, String key, Object value) {
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id,metadata) values(?,?,?, ?, jsonb_build_object(?, ?))",
      actorId, action, "USER", targetId, key, value);
  }

  public enum Role { CITIZEN, WORKER, SUPERVISOR, ADMIN }
  public record RoleRequest(Role role) { }
  public record ActiveRequest(boolean active) { }
  public record UserView(UUID id, String email, String fullName, String phone, String role, boolean active, Instant createdAt) { }
  public record UserAnalytics(long totalUsers, long activeUsers, long revokedUsers, long citizens, long workers, long supervisors, long admins) { }
}
