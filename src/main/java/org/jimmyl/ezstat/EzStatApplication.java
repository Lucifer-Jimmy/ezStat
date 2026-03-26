package org.jimmyl.ezstat;

import org.jimmyl.ezstat.Service.UserService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

@SpringBootApplication
public class EzStatApplication {

    public static void main(String[] args) {
        prepareSqliteStorage();
        SpringApplication.run(EzStatApplication.class, args);
    }

    @Bean
    public ApplicationRunner bootstrapAdminRunner(UserService userService) {
        return args -> userService.ensureAdminExistsOnStartup();
    }

    private static void prepareSqliteStorage() {
        String jdbcUrl = loadDatasourceUrlFromProperties();
        if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:sqlite:")) {
            return;
        }

        String rawPath = jdbcUrl.substring("jdbc:sqlite:".length());
        int queryIndex = rawPath.indexOf('?');
        String dbPath = (queryIndex >= 0 ? rawPath.substring(0, queryIndex) : rawPath).trim();

        if (dbPath.isEmpty() || dbPath.equals(":memory:") || dbPath.startsWith("file:")) {
            return;
        }

        try {
            Path databaseFile = Paths.get(dbPath);
            Path parent = databaseFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            if (Files.notExists(databaseFile)) {
                Files.createFile(databaseFile);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to prepare SQLite storage", ex);
        }
    }

    private static String loadDatasourceUrlFromProperties() {
        Properties props = new Properties();
        try (InputStream in = EzStatApplication.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in == null) {
                return null;
            }
            props.load(in);
            return props.getProperty("spring.datasource.url");
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load application.properties", ex);
        }
    }

}
