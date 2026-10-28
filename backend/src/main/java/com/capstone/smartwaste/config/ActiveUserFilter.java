package com.capstone.smartwaste.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Prevents a revoked/deleted account from continuing to use an already-issued JWT. */
@Component
public class ActiveUserFilter extends OncePerRequestFilter {
  private final JdbcTemplate jdbc;

  public ActiveUserFilter(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
      try {
        UUID userId = UUID.fromString(jwtAuthentication.getToken().getSubject());
        Integer active = jdbc.queryForObject("select count(*) from app_users where id=? and active=true and deleted_at is null", Integer.class, userId);
        if (active == null || active != 1) {
          SecurityContextHolder.clearContext();
          response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "This account has been revoked or deleted");
          return;
        }
      } catch (IllegalArgumentException ignored) {
        SecurityContextHolder.clearContext();
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid account session");
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
