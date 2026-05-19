# Workspace MCPs

This repository is a collection of language-specific Model Context Protocol (MCP) servers. 

## The Goal
The main idea behind this project is to give AI agents a deep, structural understanding of different codebases. Instead of treating code simply as flat text files, these MCP servers act as intelligent bridges. They provide tools that allow AI assistants to seamlessly navigate, analyze, and modify projects using the native concepts of each programming language (like classes, functions, and dependencies). This makes AI pair programming much more accurate, context-aware, and powerful.

## Current Projects
Currently, the repository houses the following servers:

- **`java-mcp`**: A dedicated server for Java environments. It allows AI agents to understand Java project structures, interact with Java source files, and execute tests seamlessly.
- **`js-mcp`**: A server tailored for JavaScript and TypeScript ecosystems. It provides capabilities to read, analyze, and manipulate JS/TS codebases by understanding the underlying code structure.

> **Note:** For now, these MCP implementations are designed to be very straightforward. They do not contain huge, complex architectures; instead, they are built as plain and simple files to keep them accessible and easy to understand.

## Design Philosophy: Why Separate Servers?
You might wonder: *Why not build a single, monolithic MCP server that supports all languages?*

The decision to split this project into independent, language-specific servers is rooted in optimization and AI reliability:

1. **Token Efficiency:** Every tool exposed to an AI model consumes tokens in the context window. If a single server exposed tools for Java, JavaScript, Python, and Rust simultaneously, it would unnecessarily inflate the token count and context size. By running independent servers, we only load the tools strictly needed for the specific language environment.
2. **Reducing Hallucinations:** When an AI is presented with an overwhelming number of tools—especially overlapping ones for different languages (e.g., a tool to parse a Java class alongside a tool to parse a JS class)—it increases the risk of confusion. The AI might hallucinate or attempt to invoke the wrong tool. A scoped, language-specific toolset keeps the AI focused and accurate.

## What's Next?
We are continuously expanding our ecosystem! Upcoming additions to this repository will include:
- **Python MCP**: To bring intelligent workspace analysis to Python projects.
- **Rust MCP**: To support the growing Rust ecosystem with native tooling and structural understanding.
- **Go MCP**: To provide native tooling and code analysis for Go codebases.
