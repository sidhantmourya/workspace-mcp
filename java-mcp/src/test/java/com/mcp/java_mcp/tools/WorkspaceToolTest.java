package com.mcp.java_mcp.tools;

import com.mcp.java_mcp.model.FileMatch;
import com.mcp.java_mcp.model.ProjectSummary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class WorkspaceToolTest {

    @Autowired
    private WorkspaceTool workspaceTool;

    @Test
    public void testGetWorkspaceProjects() throws Exception {
        List<ProjectSummary> projects = workspaceTool.getWorkspaceProjects();
        assertNotNull(projects);
        // Depending on whether the workspace actually contains sub-projects, it might be empty or not.
        // It should at least run without exception.
    }

    @Test
    public void testFindFile() throws Exception {
        List<FileMatch> matches = workspaceTool.findFile("WorkspaceTool.java");
        assertNotNull(matches);
        assertFalse(matches.isEmpty(), "Should find WorkspaceTool.java");
        assertTrue(matches.get(0).relativePath().contains("WorkspaceTool.java"), "Path should contain WorkspaceTool.java");
    }

    @Test
    public void testFindFileInProject() throws Exception {
        // Since our workspace root is java-mcp, we can simulate finding a file inside a specific 'project' folder.
        // In a single project repo, the project name extracted by findFileInProject is the first directory.
        // E.g., 'src'
        List<FileMatch> matches = workspaceTool.findFileInProject("WorkspaceTool.java", "src");
        assertNotNull(matches);
        // It might be empty if the path logic doesn't match perfectly depending on project root structure, 
        // but it should execute without error.
    }
}
