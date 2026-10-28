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
@RequestMapping("/api/v1")
public class TaskController {
  private final TaskService tasks;
  public TaskController(TaskService tasks) { this.tasks = tasks; }
  @PostMapping("/supervisor/tasks") @ResponseStatus(HttpStatus.CREATED)
  public TaskService.TaskView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTaskBody body) {
    List<TaskService.Coordinate> boundary = body.boundary() == null ? List.of() : body.boundary().stream()
      .map(p -> new TaskService.Coordinate(p.latitude(),p.longitude())).toList();
    return tasks.create(UUID.fromString(jwt.getSubject()), new TaskService.CreateTask(body.workerId(), body.assignmentMode(), body.priority(), body.dueAt(), body.complaintIds(), boundary));
  }
  @GetMapping("/supervisor/workers/availability")
  public List<TaskService.WorkerAvailability> workers() { return tasks.workerAvailability(); }
  @GetMapping("/supervisor/tasks/assignment-queue")
  public List<TaskService.TaskView> assignmentQueue() { return tasks.assignmentQueue(); }

  @GetMapping("/admin/tasks")
  public List<TaskService.TaskView> activeTasks() { return tasks.activeTasks(); }
  @GetMapping("/worker/tasks") public List<TaskService.TaskView> workerTasks(@AuthenticationPrincipal Jwt jwt) {
    return tasks.workerTasks(UUID.fromString(jwt.getSubject()));
  }
  @GetMapping("/worker/tasks/{taskId}")
  public TaskService.TaskDetail workerTaskDetail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId) {
    return tasks.workerTaskDetail(taskId, UUID.fromString(jwt.getSubject()));
  }
  @PostMapping("/worker/tasks/{taskId}/location-events")
  public TaskService.LocationResult location(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @Valid @RequestBody LocationBody body) {
    return tasks.recordLocation(taskId, UUID.fromString(jwt.getSubject()), body.toLocationEvent());
  }
  @PostMapping("/worker/tasks/{taskId}/arrive")
  public TaskService.TaskView arrive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId) {
    return tasks.arriveAtSite(taskId, UUID.fromString(jwt.getSubject()));
  }
  @PostMapping("/worker/tasks/{taskId}/resolution") @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resolution(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @Valid @RequestBody ResolutionBody body) {
    tasks.submitResolution(taskId, UUID.fromString(jwt.getSubject()), body.afterAssetIds(), body.note());
  }
  @PostMapping("/supervisor/tasks/{taskId}/resolution-review") @ResponseStatus(HttpStatus.NO_CONTENT)
  public void review(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @Valid @RequestBody ReviewBody body) {
    tasks.reviewResolution(taskId, UUID.fromString(jwt.getSubject()), body.accepted());
  }
  @GetMapping("/supervisor/tasks/resolution-review-queue")
  public List<TaskService.TaskDetail> resolutionReviewQueue() { return tasks.resolutionReviewQueue(); }

  /** Admin-only: cancel a corrupted or misaligned task and return its complaints to VERIFIED. */
  @DeleteMapping("/admin/tasks/{taskId}") @ResponseStatus(HttpStatus.NO_CONTENT)
  public void cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID taskId, @RequestBody(required = false) CancelBody body) {
    tasks.cancel(taskId, UUID.fromString(jwt.getSubject()), body == null ? null : body.reason());
  }
  public record CancelBody(String reason) { }
  @GetMapping("/supervisor/tasks/{taskId}/resolution-review")
  public TaskService.TaskDetail resolutionReviewDetail(@PathVariable UUID taskId) { return tasks.resolutionReviewDetail(taskId); }
  public record CreateTaskBody(@NotNull UUID workerId, @NotNull TaskService.AssignmentMode assignmentMode,
                               @NotNull String priority, Instant dueAt, @NotEmpty List<UUID> complaintIds,
                               List<CoordinateBody> boundary) { }
  public record CoordinateBody(double latitude, double longitude) { }
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

public record LocationBody(double latitude, double longitude, Double accuracyMeters, String capturedAt) {
    public LocationEvent toLocationEvent() {
        return new LocationEvent(latitude, longitude, accuracyMeters, capturedAt);
    }
}
  public record ResolutionBody(@NotEmpty List<UUID> afterAssetIds, String note) { }
  public record ReviewBody(boolean accepted) { }
}
