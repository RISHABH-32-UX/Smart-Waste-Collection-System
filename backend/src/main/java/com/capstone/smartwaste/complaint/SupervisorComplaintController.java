package com.capstone.smartwaste.complaint;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/supervisor")
public class SupervisorComplaintController {
  private final ComplaintService complaints;
  public SupervisorComplaintController(ComplaintService complaints) { this.complaints = complaints; }
  @GetMapping("/verification-queue")
  public List<ComplaintService.ComplaintView> queue() { return complaints.verificationQueue(); }
  @GetMapping("/assignment-ready")
  public List<ComplaintService.ComplaintView> assignmentReady() { return complaints.assignmentReady(); }
  @GetMapping("/complaints/{id}")
  public ComplaintService.ComplaintDetail detail(@PathVariable UUID id) { return complaints.detailForSupervisor(id); }
  @PostMapping("/complaints/{id}/verification")
  public ComplaintService.ComplaintView verify(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                @Valid @RequestBody VerificationBody body) {
    return complaints.verify(id, UUID.fromString(jwt.getSubject()), body.decision() == Decision.APPROVE, body.severity());
  }
  public enum Decision { APPROVE, REJECT }
  public record VerificationBody(@NotNull Decision decision, String severity) { }
}
