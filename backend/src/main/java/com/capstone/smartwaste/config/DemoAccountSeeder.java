package com.capstone.smartwaste.config;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Development convenience: seeds one account per role so the four portals
 * can be demonstrated without manual SQL. Idempotent — existing emails are
 * left untouched, and the one-role-per-user model is preserved because each
 * account is inserted with its single role. Disable with SEED_DEMO_ACCOUNTS=false.
 */
@Component
public class DemoAccountSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoAccountSeeder.class);
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final boolean enabled;

    public DemoAccountSeeder(JdbcTemplate jdbc, PasswordEncoder passwords,
                             @Value("${app.seed.demo-accounts}") boolean enabled) {
        this.jdbc = jdbc; this.passwords = passwords; this.enabled = enabled;
    }

    private record DemoAccount(String email, String fullName, String role) { }

    // Minimum 12 chars to satisfy the registration password policy.
    private static final String DEMO_PASSWORD = "CleanCity#Demo2026";
    private static final List<DemoAccount> ACCOUNTS = List.of(
        new DemoAccount("admin@cleancity.demo", "Demo Administrator", "ADMIN"),
        new DemoAccount("supervisor@cleancity.demo", "Demo Supervisor", "SUPERVISOR"),
        new DemoAccount("worker@cleancity.demo", "Demo Worker", "WORKER"),
        new DemoAccount("citizen@cleancity.demo", "Demo Citizen", "CITIZEN"));

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        for (DemoAccount account : ACCOUNTS) {
            Integer exists = jdbc.queryForObject("select count(*) from app_users where email = ?", Integer.class, account.email());
            if (exists != null && exists > 0) continue;
            jdbc.update("insert into app_users(id,email,password_hash,full_name,phone,role) values (?,?,?,?,?,?)",
                UUID.randomUUID(), account.email(), passwords.encode(DEMO_PASSWORD), account.fullName(), null, account.role());
            log.info("Seeded demo {} account {} (password: {})", account.role(), account.email(), DEMO_PASSWORD);
        }
    }
}
