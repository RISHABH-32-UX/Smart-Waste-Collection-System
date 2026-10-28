package com.capstone.smartwaste.profile;

import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** The signed-in user's own profile. Roles never receive another user's profile through this endpoint. */
@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
  private final JdbcTemplate jdbc;

  public ProfileController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping
  public ProfileView mine(@AuthenticationPrincipal Jwt jwt) {
    UUID userId = UUID.fromString(jwt.getSubject());
    return jdbc.query("""
        select id,full_name,email,phone,role,active,created_at
        from app_users where id=?
        """, (rs, row) -> new ProfileView(
          UUID.fromString(rs.getString("id")), rs.getString("full_name"), rs.getString("email"),
          rs.getString("phone"), rs.getString("role"), rs.getBoolean("active"),
          rs.getTimestamp("created_at").toInstant()), userId)
      .stream().findFirst()
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found"));
  }

  public record ProfileView(UUID id, String fullName, String email, String phone, String role,
                            boolean active, Instant createdAt) { }
}
