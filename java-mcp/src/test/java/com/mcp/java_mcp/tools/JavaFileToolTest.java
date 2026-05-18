package com.mcp.java_mcp.tools;

import com.mcp.java_mcp.model.ClassSummary;
import com.mcp.java_mcp.model.MethodSignature;
import com.mcp.java_mcp.model.MethodWithContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ParserConfiguration;
import org.junit.jupiter.api.BeforeAll;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class JavaFileToolTest {

    @Autowired
    private JavaFileTool javaFileTool;

    private final String testFilePath = "src/main/java/com/mcp/java_mcp/tools/JavaFileTool.java";

    @BeforeAll
    public static void setup() {
        StaticJavaParser.getParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);
    }

    @Test
    public void testJavaGetFunctions() throws Exception {
        List<MethodSignature> methods = javaFileTool.java_getFunctions(testFilePath);
        assertNotNull(methods);
        assertFalse(methods.isEmpty(), "Methods list should not be empty");
        assertTrue(methods.stream().anyMatch(m -> m.name().equals("java_getFunctions")), "Should contain java_getFunctions method");
    }

    @Test
    public void testJavaGetFunctionBody() throws Exception {
        String body = javaFileTool.java_getFunctionBody(testFilePath, "java_getFunctions");
        assertNotNull(body);
        assertTrue(body.contains("CompilationUnit cu = parse(relativePath);"), "Body should contain specific code snippet");
    }

    @Test
    public void testJavaGetFunctionByLine() throws Exception {
        // Find line number first
        List<MethodSignature> methods = javaFileTool.java_getFunctions(testFilePath);
        int line = methods.stream().filter(m -> m.name().equals("java_getFunctions")).findFirst().get().startLine();
        
        String body = javaFileTool.java_getFunctionByLine(testFilePath, line);
        assertNotNull(body);
        assertTrue(body.contains("java_getFunctions"), "Body should contain the method name");
    }

    @Test
    public void testJavaGetFunctionWithContext() throws Exception {
        MethodWithContext context = javaFileTool.java_getFunctionWithContext(testFilePath, "java_getFunctions");
        assertNotNull(context);
        assertNotNull(context.body(), "Body should not be null");
        assertFalse(context.imports().isEmpty(), "Imports should not be empty");
        assertFalse(context.fields().isEmpty(), "Fields should not be empty");
    }

    @Test
    public void testJavaGetClassSummary() throws Exception {
        ClassSummary summary = javaFileTool.java_getClassSummary(testFilePath, "JavaFileTool");
        assertNotNull(summary);
        assertFalse(summary.fields().isEmpty(), "Class should have fields");
        assertFalse(summary.methods().isEmpty(), "Class should have methods");
        assertFalse(summary.annotations().isEmpty(), "Class should have annotations");
    }
}
