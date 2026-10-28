package com.capstone.smartwaste.task;

import java.time.Instant;

public interface LocationEvent {
    double latitude();
    double longitude();
    Double accuracyMeters();
    Instant getCapturedAt();
}