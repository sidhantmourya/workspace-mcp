package com.mcp.java_mcp.tools;

import com.mcp.java_mcp.model.TestClassResult;
import com.mcp.java_mcp.model.TestResult;
import com.mcp.java_mcp.util.PathSanitizer;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TestRunnerTool {

    private final PathSanitizer sanitizer;

    @Value("${app.workspace-root}")
    private String workspaceRoot;

    // store last output per test for getTestOutput
    private final Map<String, String> lastOutputs = new ConcurrentHashMap<>();

    public TestRunnerTool(PathSanitizer sanitizer) {
        this.sanitizer = sanitizer;
    }

    @Tool(description = """
        Run a specific test method and return the result.
        Returns PASS, FAIL, ERROR, or COMPILATION_ERROR with a concise reason.
        Use this after writing or modifying code to verify correctness.
        If FAIL: fix the code and call again.
        Do NOT retry more than 5 times — surface to the user if still failing.
        """)
    public TestResult java_runTest(
            @ToolParam(description = "Relative path to the test Java file from workspace root") String relativePath,
            @ToolParam(description = "Name of the test method to run") String methodName) throws Exception {

        String className = extractClassName(relativePath);
        String projectRoot = resolveProjectRoot(relativePath);

        // Use mvn.cmd on Windows, mvn on Unix
        String mvnCommand = System.getProperty("os.name").toLowerCase().contains("win") ? "mvn.cmd" : "mvn";

        ProcessBuilder pb = new ProcessBuilder(
            mvnCommand, "test",
            "-Dtest=" + className + "#" + methodName,
            "--no-transfer-progress"
        );
        pb.environment().remove("JAVA_TOOL_OPTIONS");
        pb.directory(new File(projectRoot));
        pb.redirectErrorStream(true);

        long start = System.currentTimeMillis();
        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();
        String duration = ((System.currentTimeMillis() - start) / 1000.0) + "s";

        String key = relativePath + "#" + methodName;
        lastOutputs.put(key, output);

        if (output.contains("COMPILATION ERROR") || output.contains("BUILD FAILURE")
                && output.contains("compiler")) {
            return new TestResult(TestResult.Status.COMPILATION_ERROR,
                extractCompilationError(output), -1, duration, output);
        }

        if (exitCode == 0) {
            return new TestResult(TestResult.Status.PASS, null, -1, duration, output);
        }

        String reason = extractFailureReason(output);
        int line = extractFailureLine(output);
        return new TestResult(TestResult.Status.FAIL, reason, line, duration, output);
    }

    @Tool(description = """
        Run all test methods in a test class and return a summary.
        Use this to check nothing was broken after a code change.
        """)
    public TestClassResult java_runTestClass(
            @ToolParam(description = "Relative path to the test Java file from workspace root") String relativePath) throws Exception {
        String className = extractClassName(relativePath);
        String projectRoot = resolveProjectRoot(relativePath);

        String mvnCommand = System.getProperty("os.name").toLowerCase().contains("win") ? "mvn.cmd" : "mvn";

        ProcessBuilder pb = new ProcessBuilder(
            mvnCommand, "test",
            "-Dtest=" + className,
            "--no-transfer-progress"
        );
        pb.environment().remove("JAVA_TOOL_OPTIONS");
        pb.directory(new File(projectRoot));
        pb.redirectErrorStream(true);

        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        process.waitFor();

        return parseTestClassResult(output);
    }

    @Tool(description = """
        Get the full stdout of the last test run for a specific method.
        Use this when java_runTest reason is not detailed enough
        and you need the full stack trace.
        """)
    public String java_getTestOutput(
            @ToolParam(description = "Relative path to the test Java file from workspace root") String relativePath,
            @ToolParam(description = "Name of the test method") String methodName) {
        String key = relativePath + "#" + methodName;
        return lastOutputs.getOrDefault(key, "No output found. Run the test first.");
    }

    // --- helpers ---

    private String extractClassName(String relativePath) {
        String fileName = Paths.get(relativePath).getFileName().toString();
        return fileName.replace(".java", "");
    }

    private String resolveProjectRoot(String relativePath) {
        // first path segment is the project folder
        String projectName = Paths.get(relativePath).getName(0).toString();
        return Paths.get(workspaceRoot, projectName).toString();
    }

    private String extractFailureReason(String output) {
        String[] lines = output.split("\n");
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].contains("AssertionError") || lines[i].contains("expected")
                    || lines[i].contains("Exception")) {
                return lines[i].trim();
            }
        }
        return "Unknown failure — call java_getTestOutput for full details";
    }

    private int extractFailureLine(String output) {
        for (String line : output.split("\n")) {
            if (line.contains("at ") && line.contains("Test.java:")) {
                try {
                    String part = line.substring(line.lastIndexOf(":") + 1, line.lastIndexOf(")"));
                    return Integer.parseInt(part.trim());
                } catch (NumberFormatException ignored) {}
            }
        }
        return -1;
    }

    private String extractCompilationError(String output) {
        for (String line : output.split("\n")) {
            if (line.contains("ERROR") && line.contains(".java")) {
                return line.trim();
            }
        }
        return "Compilation failed — call java_getTestOutput for details";
    }

    private TestClassResult parseTestClassResult(String output) {
        List<String> passed = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (String line : output.split("\n")) {
            if (line.trim().startsWith("FAIL") || line.contains("<<< FAILURE!")) {
                String method = extractMethodFromSurefireLine(line);
                if (!method.isEmpty()) failed.add(method);
            }
            if (line.trim().startsWith("ERROR") || line.contains("<<< ERROR!")) {
                String method = extractMethodFromSurefireLine(line);
                if (!method.isEmpty()) errors.add(method);
            }
        }

        String summary = "passed: " + passed.size()
            + ", failed: " + failed.size()
            + ", errors: " + errors.size();

        return new TestClassResult(passed, failed, errors, summary);
    }

    private String extractMethodFromSurefireLine(String line) {
        // surefire format: "methodName(com.example.ClassName)"
        try {
            int start = line.indexOf(" ") + 1;
            int end = line.indexOf("(");
            if (start > 0 && end > start) return line.substring(start, end).trim();
        } catch (Exception ignored) {}
        return "";
    }
}
