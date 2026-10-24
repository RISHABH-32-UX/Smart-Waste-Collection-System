package com.capstone.smartwaste.complaint;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {
  private final ComplaintService service;
  public ComplaintController(ComplaintService service) { this.service = service; }
  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  public ComplaintService.ComplaintView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateBody body) {
    return service.create(UUID.fromString(jwt.getSubject()), new ComplaintService.CreateComplaint(
      body.description(), body.location().latitude(), body.location().longitude(), body.beforeAssetIds()));
  }
  @GetMapping public List<ComplaintService.ComplaintView> list(@AuthenticationPrincipal Jwt jwt) {
    return service.listMine(UUID.fromString(jwt.getSubject()));
  }
  @GetMapping("/{id}") public ComplaintService.ComplaintView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    return service.find(id, UUID.fromString(jwt.getSubject()), false);
  }
  public record CreateBody(@NotBlank @Size(min=5,max=2000) String description, @Valid Location location,
                           @NotEmpty List<UUID> beforeAssetIds) { }
  public record Location(double latitude, double longitude) { }
}

