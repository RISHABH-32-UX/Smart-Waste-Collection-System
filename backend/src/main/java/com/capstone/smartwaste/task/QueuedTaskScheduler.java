package com.capstone.smartwaste.task;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class QueuedTaskScheduler {
  private final TaskService tasks;
  public QueuedTaskScheduler(TaskService tasks) { this.tasks = tasks; }

  /** Checks queued work every minute while the backend is running. */
  @Scheduled(fixedDelay = 60_000)
  public void assignDueQueuedTasks() { tasks.assignDueQueuedTasks(); }
}
