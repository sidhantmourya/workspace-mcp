package com.mcp.java_mcp.tools;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.Test;
import java.nio.file.Paths;

public class JavaParserInstanceTest {
    @Test
    public void check() throws Exception {
        ParserConfiguration config = new ParserConfiguration();
        config.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);
        JavaParser javaParser = new JavaParser(config);

        CompilationUnit cu = javaParser
                .parse(Paths.get("src/main/java/com/mcp/java_mcp/tools/JavaFileTool.java").toFile()).getResult().get();
        System.out.println("Parsed: " + cu.getClass().getName());
    }
}
