package com.mcp.java_mcp.tools;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.mcp.java_mcp.model.ClassSummary;
import com.mcp.java_mcp.model.MethodSignature;
import com.mcp.java_mcp.model.MethodWithContext;
import com.mcp.java_mcp.util.PathSanitizer;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.List;

@Service
public class JavaFileTool {

    private final PathSanitizer sanitizer;
    private final JavaParser javaParser;

    public JavaFileTool(PathSanitizer sanitizer, @Value("${app.java-parser-level:JAVA_21}") String javaParserLevel) {
        this.sanitizer = sanitizer;
        ParserConfiguration config = new ParserConfiguration();
        config.setLanguageLevel(ParserConfiguration.LanguageLevel.valueOf(javaParserLevel));
        this.javaParser = new JavaParser(config);
    }

    @Tool(description = """
        Get all method signatures from a Java file.
        Returns name, params, return type, line range, and enclosing class.
        Does NOT return method bodies — call java_getFunctionBody for that.
        Always call this first before reading any method body.
        """)
    public List<MethodSignature> java_getFunctions(
            @ToolParam(description = "Relative path to the Java file from workspace root") String relativePath) throws Exception {
        CompilationUnit cu = parse(relativePath);
        return cu.findAll(MethodDeclaration.class).stream()
            .map(m -> new MethodSignature(
                m.getNameAsString(),
                m.getParameters().toString(),
                m.getTypeAsString(),
                m.getBegin().map(p -> p.line).orElse(-1),
                m.getEnd().map(p -> p.line).orElse(-1),
                enclosingClass(m)
            ))
            .toList();
    }

    @Tool(description = """
        Get the full source body of a specific method by name.
        If the method is overloaded, returns the first match.
        Use java_getFunctionByLine to target a specific overload.
        """)
    public String java_getFunctionBody(
            @ToolParam(description = "Relative path to the Java file from workspace root") String relativePath,
            @ToolParam(description = "Name of the method to retrieve") String methodName) throws Exception {
        CompilationUnit cu = parse(relativePath);
        return cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> m.getNameAsString().equals(methodName))
            .map(Node::toString)
            .findFirst()
            .orElse("Method not found: " + methodName);
    }

    @Tool(description = """
        Get the full source body of a method at a specific line number.
        Use this to disambiguate overloaded methods.
        Get the line number from java_getFunctions first.
        """)
    public String java_getFunctionByLine(
            @ToolParam(description = "Relative path to the Java file from workspace root") String relativePath,
            @ToolParam(description = "Start line number of the method (from java_getFunctions)") int lineNumber) throws Exception {
        CompilationUnit cu = parse(relativePath);
        return cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> m.getBegin().map(p -> p.line).orElse(-1) == lineNumber)
            .map(Node::toString)
            .findFirst()
            .orElse("No method found at line: " + lineNumber);
    }

    @Tool(description = """
        Get a method body plus the class fields and imports it depends on.
        Use this when the method references injected beans or class-level state
        and you need that context to understand it fully.
        """)
    public MethodWithContext java_getFunctionWithContext(
            @ToolParam(description = "Relative path to the Java file from workspace root") String relativePath,
            @ToolParam(description = "Name of the method to retrieve with context") String methodName) throws Exception {
        CompilationUnit cu = parse(relativePath);

        String body = cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> m.getNameAsString().equals(methodName))
            .map(Node::toString)
            .findFirst()
            .orElse("Method not found: " + methodName);

        List<String> imports = cu.getImports().stream()
            .map(Node::toString)
            .toList();

        List<String> fields = cu.findAll(FieldDeclaration.class).stream()
            .map(Node::toString)
            .toList();

        return new MethodWithContext(body, imports, fields);
    }

    @Tool(description = """
        Get a class-level summary including fields, all method signatures,
        base classes, and annotations. Use this to understand class structure
        before diving into individual methods.
        """)
    public ClassSummary java_getClassSummary(
            @ToolParam(description = "Relative path to the Java file from workspace root") String relativePath,
            @ToolParam(description = "Name of the class to summarize") String className) throws Exception {
        CompilationUnit cu = parse(relativePath);

        ClassOrInterfaceDeclaration cls = cu.findAll(ClassOrInterfaceDeclaration.class)
            .stream()
            .filter(c -> c.getNameAsString().equals(className))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Class not found: " + className));

        List<String> fields = cls.getFields().stream()
            .map(Node::toString)
            .toList();

        List<MethodSignature> methods = cls.getMethods().stream()
            .map(m -> new MethodSignature(
                m.getNameAsString(),
                m.getParameters().toString(),
                m.getTypeAsString(),
                m.getBegin().map(p -> p.line).orElse(-1),
                m.getEnd().map(p -> p.line).orElse(-1),
                className
            ))
            .toList();

        List<String> baseClasses = cls.getExtendedTypes().stream()
            .map(t -> t.getNameAsString())
            .toList();

        List<String> annotations = cls.getAnnotations().stream()
            .map(Node::toString)
            .toList();

        return new ClassSummary(fields, methods, baseClasses, annotations);
    }

    // --- helpers ---

    private CompilationUnit parse(String relativePath) throws Exception {
        Path full = sanitizer.safe(relativePath);
        return javaParser.parse(full.toFile()).getResult()
            .orElseThrow(() -> new IllegalStateException("Failed to parse Java file: " + relativePath));
    }

    private String enclosingClass(MethodDeclaration method) {
        return method.findAncestor(ClassOrInterfaceDeclaration.class)
            .map(c -> c.getNameAsString())
            .orElse("unknown");
    }
}
