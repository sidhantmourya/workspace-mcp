package com.mcp.java_mcp.tools;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ParserConfiguration;
import org.junit.jupiter.api.Test;
import java.nio.file.Paths;

public class JavaParserCheckTest {
    @Test
    public void check() throws Exception {
        StaticJavaParser.getParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);
        StaticJavaParser.parse(Paths.get("src/main/java/com/mcp/java_mcp/tools/JavaFileTool.java"));
        System.out.println("Parsed successfully!");
    }
}
