package com.capstone.smartwaste.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {
  private final AuthService auth;
  public AuthController(AuthService auth) { this.auth = auth; }

  @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
  public AuthService.AuthResponse register(@Valid @RequestBody RegistrationBody body) {
    return auth.register(new AuthService.RegisterRequest(body.email(), body.password(), body.fullName(), body.phone(), body.role()));
  }
  @PostMapping("/login")
  public AuthService.AuthResponse login(@Valid @RequestBody LoginBody body) {
    return auth.login(new AuthService.LoginRequest(body.email(), body.password()));
  }
  public record RegistrationBody(@Email @NotBlank String email, @Size(min=12,max=128) String password,
                                 @NotBlank @Size(max=160) String fullName, @Size(max=32) String phone,
                                 @jakarta.validation.constraints.Pattern(regexp = "CITIZEN|WORKER",
                                   message = "Role must be CITIZEN or WORKER") String role) { }
  public record LoginBody(@Email @NotBlank String email, @NotBlank String password) { }
}
