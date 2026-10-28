package com.capstone.smartwaste.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Streams private development media only to its owner or authorized municipal staff. */
@RestController
@RequestMapping("/api/v1/media")
public class MediaContentController {
  private final JdbcTemplate jdbc;
  private final Path uploadDirectory;

  public MediaContentController(JdbcTemplate jdbc, @Value("${app.storage.local-directory}") String directory) {
    this.jdbc = jdbc;
    this.uploadDirectory = Path.of(directory).toAbsolutePath().normalize();
  }

  @GetMapping("/{assetId}/content")
  public ResponseEntity<FileSystemResource> content(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID assetId) {
    MediaAsset asset = jdbc.query("select owner_id,storage_key,original_name,content_type from media_assets where id=?",
      (rs, row) -> new MediaAsset(UUID.fromString(rs.getString("owner_id")), rs.getString("storage_key"), rs.getString("original_name"), rs.getString("content_type")), assetId)
      .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Media not found"));
    List<String> roles = jwt.getClaimAsStringList("roles");
    boolean staff = roles != null && (roles.contains("SUPERVISOR") || roles.contains("ADMIN"));
    UUID requesterId = UUID.fromString(jwt.getSubject());
    // A worker can view only evidence associated with a task currently assigned to them.
    // This gives field staff the before-photo context without exposing unrelated citizen media.
    boolean assignedWorker = roles != null && roles.contains("WORKER") && Boolean.TRUE.equals(jdbc.queryForObject("""
      select exists(
        select 1 from tasks t
        join task_complaints tc on tc.task_id=t.id
        join complaint_media cm on cm.complaint_id=tc.complaint_id
        where t.assigned_worker_id=? and cm.asset_id=?
      )
      """, Boolean.class, requesterId, assetId));
    if (!staff && !assignedWorker && !asset.ownerId().equals(requesterId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this media");
    }

    Path image = uploadDirectory.resolve(asset.storageKey()).normalize();
    if (!image.startsWith(uploadDirectory) || !Files.isRegularFile(image)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media file is unavailable");
    }
    return ResponseEntity.ok()
      .contentType(MediaType.parseMediaType(asset.contentType()))
      .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(asset.originalName()).build().toString())
      .body(new FileSystemResource(image));
  }

  private record MediaAsset(UUID ownerId, String storageKey, String originalName, String contentType) { }
}
