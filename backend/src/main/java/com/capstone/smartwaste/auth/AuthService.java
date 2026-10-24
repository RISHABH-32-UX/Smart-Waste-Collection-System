package com.capstone.smartwaste.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final JdbcTemplate jdbc;
  private final PasswordEncoder passwords;
  private final JwtEncoder jwtEncoder;
  private final String issuer;

  public AuthService(JdbcTemplate jdbc, JwtEncoder jwtEncoder, PasswordEncoder passwords, @Value("${app.jwt.issuer}") String issuer) {
    this.jdbc = jdbc; this.jwtEncoder = jwtEncoder; this.issuer = issuer;
    this.passwords = passwords;
  }

  // Self-service registration may only create CITIZEN or WORKER accounts;
  // SUPERVISOR and ADMIN are provisioned exclusively via the admin console.
  private static final List<String> SELF_SERVICE_ROLES = List.of("CITIZEN", "WORKER");

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    Integer exists = jdbc.queryForObject("select count(*) from app_users where email = ?", Integer.class, request.email());
    if (exists != null && exists > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    String role = SELF_SERVICE_ROLES.contains(request.role()) ? request.role() : "CITIZEN";
    UUID id = UUID.randomUUID();
    jdbc.update("insert into app_users(id,email,password_hash,full_name,phone,role) values (?,?,?,?,?,?)",
      id, request.email().trim().toLowerCase(), passwords.encode(request.password()), request.fullName().trim(), request.phone(), role);
    return issue(id, request.email(), role);
  }

  public AuthResponse login(LoginRequest request) {
    List<UserLogin> matches = jdbc.query("select id,email,password_hash,role from app_users where email=? and active=true",
      (rs, row) -> new UserLogin(UUID.fromString(rs.getString("id")), rs.getString("email"), rs.getString("password_hash"), rs.getString("role")),
      request.email().trim().toLowerCase());
    if (matches.isEmpty() || !passwords.matches(request.password(), matches.get(0).hash()))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    UserLogin user = matches.get(0);
    return issue(user.id(), user.email(), user.role());
  }

  private AuthResponse issue(UUID id, String email, String role) {
    Instant now = Instant.now();
    JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(id.toString()).audience(List.of("smart-waste-web"))
      .issuedAt(now).expiresAt(now.plus(15, ChronoUnit.MINUTES)).id(UUID.randomUUID().toString())
      .claim("email", email).claim("roles", List.of(role)).build();
    String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    return new AuthResponse(token, "Bearer", 900, id, role);
  }

  record UserLogin(UUID id, String email, String hash, String role) { }
  public record RegisterRequest(String email, String password, String fullName, String phone, String role) { }
  public record LoginRequest(String email, String password) { }
  public record AuthResponse(String accessToken, String tokenType, int expiresIn, UUID userId, String role) { }
}
