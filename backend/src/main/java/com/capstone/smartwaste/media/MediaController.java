package com.capstone.smartwaste.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/uploads")
public class MediaController {
  private final JdbcTemplate jdbc;
  private final Path uploadDirectory;
  public MediaController(JdbcTemplate jdbc, @Value("${app.storage.local-directory}") String directory) {
    this.jdbc = jdbc; this.uploadDirectory = Path.of(directory).toAbsolutePath().normalize();
  }

  @PostMapping(consumes = "multipart/form-data") @ResponseStatus(HttpStatus.CREATED)
  public UploadResponse upload(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("Image must be 1-10 MB");
    String type = file.getContentType();
    if (type == null || !(type.equals("image/jpeg") || type.equals("image/png") || type.equals("image/webp")))
      throw new IllegalArgumentException("Only JPEG, PNG, and WEBP images are allowed");
    UUID assetId = UUID.randomUUID();
    String safeName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "image" : file.getOriginalFilename());
    if (safeName.contains("..")) throw new IllegalArgumentException("Invalid filename");
    Files.createDirectories(uploadDirectory);
    String key = assetId + "-" + safeName.replaceAll("[^a-zA-Z0-9._-]", "_");
    file.transferTo(uploadDirectory.resolve(key));
    jdbc.update("insert into media_assets(id,owner_id,storage_key,original_name,content_type,size_bytes) values(?,?,?,?,?,?)",
      assetId, UUID.fromString(jwt.getSubject()), key, safeName, type, file.getSize());
    return new UploadResponse(assetId, safeName, type, file.getSize());
  }
  public record UploadResponse(UUID assetId, String filename, String contentType, long sizeBytes) { }
}

