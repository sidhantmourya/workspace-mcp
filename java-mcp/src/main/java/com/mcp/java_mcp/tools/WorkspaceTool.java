package com.mcp.java_mcp.tools;

import com.mcp.java_mcp.model.FileMatch;
import com.mcp.java_mcp.model.ProjectSummary;
import com.mcp.java_mcp.util.PathSanitizer;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static com.mcp.java_mcp.tools.WorkspaceConstant.*;

@Service
public class WorkspaceTool {

    private final PathSanitizer sanitizer;

    public WorkspaceTool(PathSanitizer sanitizer) {
        this.sanitizer = sanitizer;
    }

    @Tool(description = """
            Returns all projects in the workspace with their language type,
            source root, and build file. Call this once at the start of a session
            to understand workspace layout before searching for files.
            """)
    public List<ProjectSummary> getWorkspaceProjects() throws IOException {
        List<ProjectSummary> projects = new ArrayList<>();
        Path workspace = Paths.get(sanitizer.getWorkspaceRoot());
        
        // 1. Check root directory
        String rootName = workspace.getFileName().toString();
        if (Files.exists(workspace.resolve(POM_XML))) {
            projects.add(new ProjectSummary(rootName, TYPE_SPRING_BOOT,
                    SRC_MAIN_JAVA, POM_XML));
        } else if (Files.exists(workspace.resolve(BUILD_GRADLE))) {
            projects.add(new ProjectSummary(rootName, TYPE_GRADLE_JAVA,
                    SRC_MAIN_JAVA, BUILD_GRADLE));
        } else if (Files.exists(workspace.resolve(PACKAGE_JSON))) {
            projects.add(new ProjectSummary(rootName, TYPE_NODE,
                    SRC, PACKAGE_JSON));
        } else if (Files.exists(workspace.resolve(REQUIREMENTS_TXT))) {
            projects.add(new ProjectSummary(rootName, TYPE_PYTHON,
                    SRC, REQUIREMENTS_TXT));
        }

        // 2. Check sub directories
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(workspace)) {
            for (Path entry : stream) {
                if (!Files.isDirectory(entry))
                    continue;

                String name = entry.getFileName().toString();
                
                if (Files.exists(entry.resolve(POM_XML))) {
                    projects.add(new ProjectSummary(name, TYPE_SPRING_BOOT,
                            name + "/" + SRC_MAIN_JAVA, POM_XML));
                } else if (Files.exists(entry.resolve(BUILD_GRADLE))) {
                    projects.add(new ProjectSummary(name, TYPE_GRADLE_JAVA,
                            name + "/" + SRC_MAIN_JAVA, BUILD_GRADLE));
                } else if (Files.exists(entry.resolve(PACKAGE_JSON))) {
                    projects.add(new ProjectSummary(name, TYPE_NODE,
                            name + "/" + SRC, PACKAGE_JSON));
                } else if (Files.exists(entry.resolve(REQUIREMENTS_TXT))) {
                    projects.add(new ProjectSummary(name, TYPE_PYTHON,
                            name + "/" + SRC, REQUIREMENTS_TXT));
                }
            }
        }
        
        return projects;
    }

    @Tool(description = """
            Search for a file by name across all projects in the workspace.
            Returns enriched matches with project, package, and metadata.
            Use this when the user does not mention which project the file is in.
            If multiple matches are found, use projectName and packageName to infer
            the correct one. Only ask the user if genuinely ambiguous.
            """)
    public List<FileMatch> findFile(@ToolParam(description = "Name of the file to search for") String fileName)
            throws IOException {
        return searchInPath(sanitizer.getWorkspaceRoot(), fileName);
    }

    @Tool(description = """
            Search for a file by name within a specific project.
            Use this when the user explicitly mentions a project name.
            Faster and avoids cross-project ambiguity.
            """)
    public List<FileMatch> findFileInProject(
            @ToolParam(description = "Name of the file to search for") String fileName,
            @ToolParam(description = "Name of the project to search within") String projectName) throws IOException {
        Path projectPath = sanitizer.safe(projectName);
        return searchInPath(projectPath.toString(), fileName);
    }

    private List<FileMatch> searchInPath(String root, String fileName) throws IOException {
        List<FileMatch> results = new ArrayList<>();
        Path rootPath = Paths.get(root);

        Files.walkFileTree(rootPath, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (file.getFileName().toString().equals(fileName)) {
                    Path relative = Paths.get(sanitizer.getWorkspaceRoot()).relativize(file);
                    String projectName = relative.getName(0).toString();
                    String packageName = resolvePackage(file);
                    long lineCount = countLines(file);
                    String lastModified = formatAge(attrs.lastModifiedTime().toInstant());

                    results.add(new FileMatch(
                            relative.toString(),
                            projectName,
                            packageName,
                            lineCount,
                            lastModified));
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return results;
    }

    private String resolvePackage(Path file) {
        try {
            return Files.lines(file)
                    .limit(10)
                    .filter(l -> l.startsWith(PACKAGE_PREFIX))
                    .map(l -> l.replace(PACKAGE_PREFIX, "").replace(";", "").trim())
                    .findFirst()
                    .orElse(PACKAGE_UNKNOWN);
        } catch (IOException e) {
            return PACKAGE_UNKNOWN;
        }
    }

    private long countLines(Path file) {
        try {
            return Files.lines(file).count();
        } catch (IOException e) {
            return -1;
        }
    }

    private String formatAge(Instant instant) {
        long days = ChronoUnit.DAYS.between(instant, Instant.now());
        if (days == 0)
            return AGE_TODAY;
        if (days == 1)
            return AGE_YESTERDAY;
        return days + AGE_DAYS_AGO;
    }
}
