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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminController {
  private final JdbcTemplate jdbc;
  public AdminController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping
  public List<UserView> users() {
    return jdbc.query("select id,email,full_name,phone,role,active,created_at from app_users order by created_at desc",
      (rs, row) -> new UserView(UUID.fromString(rs.getString("id")), rs.getString("email"), rs.getString("full_name"),
        rs.getString("phone"), rs.getString("role"), rs.getBoolean("active"), rs.getTimestamp("created_at").toInstant()));
  }

  @PutMapping("/{id}/role") @Transactional
  public UserView setRole(@AuthenticationPrincipal Jwt admin, @PathVariable UUID id, @RequestBody RoleRequest request) {
    UUID actorId = UUID.fromString(admin.getSubject());
    if (actorId.equals(id) && request.role() != Role.ADMIN)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrators cannot remove their own admin role");
    int changed = jdbc.update("update app_users set role=? where id=?", request.role().name(), id);
    if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    jdbc.update("insert into audit_logs(actor_id,action,entity_type,entity_id,metadata) values(?,?,?, ?, jsonb_build_object('role', ?))",
      actorId, "USER_ROLE_CHANGED", "USER", id, request.role().name());
    return jdbc.queryForObject("select id,email,full_name,phone,role,active,created_at from app_users where id=?",
      (rs, row) -> new UserView(UUID.fromString(rs.getString("id")), rs.getString("email"), rs.getString("full_name"),
        rs.getString("phone"), rs.getString("role"), rs.getBoolean("active"), rs.getTimestamp("created_at").toInstant()), id);
  }

  public enum Role { CITIZEN, WORKER, SUPERVISOR, ADMIN }
  public record RoleRequest(Role role) { }
  public record UserView(UUID id, String email, String fullName, String phone, String role, boolean active, Instant createdAt) { }
}
