package com.capstone.smartwaste.task;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class TaskController {
  private final TaskService tasks;
  public TaskController(TaskService tasks) { this.tasks = tasks; }
  @PostMapping("/api/v1/supervisor/tasks") @ResponseStatus(HttpStatus.CREATED)
  public TaskService.TaskView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTaskBody body) {
    List<TaskService.Coordinate> boundary = body.boundary() == null ? List.of() : body.boundary().stream()
      .map(p -> new TaskService.Coordinate(p.latitude(),p.longitude())).toList();
    return tasks.create(UUID.fromString(jwt.getSubject()), new TaskService.CreateTask(body.workerId(), body.assignmentMode(), body.priority(), body.dueAt(), body.complaintIds(), boundary));
  }
  @GetMapping("/api/v1/supervisor/workers/availability")
  public List<TaskService.WorkerAvailability> workers() { return tasks.workerAvailability(); }
  @GetMapping("/api/v1/supervisor/tasks/assignment-queue")
  public List<TaskService.TaskView> assignmentQueue() { return tasks.assignmentQueue(); }
  @GetMapping("/api/v1/worker/tasks") public List<TaskService.TaskView> workerTasks(@AuthenticationPrincipal Jwt jwt) {
    return tasks.workerTasks(UUID.fromString(jwt.getSubject()));
  }
  @GetMapping("/api/v1/worker/tasks/{taskId}")
  public TaskService.TaskDetail workerTaskDetail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId) {
    return tasks.workerTaskDetail(taskId, UUID.fromString(jwt.getSubject()));
  }
  @PostMapping("/api/v1/worker/tasks/{taskId}/location-events")
  public TaskService.LocationResult location(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @Valid @RequestBody LocationBody body) {
    return tasks.recordLocation(taskId, UUID.fromString(jwt.getSubject()), new TaskService.LocationEvent(body.latitude(),body.longitude(),body.accuracyMeters(),body.capturedAt()));
  }
  @PostMapping("/api/v1/worker/tasks/{taskId}/resolution") @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resolution(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @Valid @RequestBody ResolutionBody body) {
    tasks.submitResolution(taskId, UUID.fromString(jwt.getSubject()), body.afterAssetIds(), body.note());
  }
  @PostMapping("/api/v1/supervisor/tasks/{taskId}/resolution-review") @ResponseStatus(HttpStatus.NO_CONTENT)
  public void review(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @RequestBody ReviewBody body) {
    tasks.reviewResolution(taskId, UUID.fromString(jwt.getSubject()), body.accepted());
  }
  @GetMapping("/api/v1/supervisor/tasks/resolution-review-queue")
  public List<TaskService.TaskDetail> resolutionReviewQueue() { return tasks.resolutionReviewQueue(); }
  @GetMapping("/api/v1/supervisor/tasks/{taskId}/resolution-review")
  public TaskService.TaskDetail resolutionReviewDetail(@PathVariable UUID taskId) { return tasks.resolutionReviewDetail(taskId); }
  public record CreateTaskBody(@NotNull UUID workerId, @NotNull TaskService.AssignmentMode assignmentMode,
                               @NotNull String priority, Instant dueAt, @NotEmpty List<UUID> complaintIds,
                               List<CoordinateBody> boundary) { }
  public record CoordinateBody(double latitude, double longitude) { }
  public record LocationBody(double latitude, double longitude, double accuracyMeters, @NotNull Instant capturedAt) { }
  public record ResolutionBody(@NotEmpty List<UUID> afterAssetIds, String note) { }
  public record ReviewBody(boolean accepted) { }
}
