# Agent Skills Overview

This document provides an overview of the `agent-skills` and `antigravity-skills` directories included in this project, and explains how to utilize them to improve the development workflows for `eng_planner`.

## 1. Agent Skills (`/agent-skills`)

This folder contains **Addy Osmani's Agent Skills**, a comprehensive suite of 24 production-grade engineering skills that map directly to the software development lifecycle. These skills encode the workflows, quality gates, and best practices that senior engineers use, ensuring the AI agent follows them consistently.

### Key Features:
- **Lifecycle Mapping:** Skills cover Definition, Planning, Building, Verification, Review, and Shipping.
- **Slash Commands:** Provides intuitive commands like `/spec`, `/plan`, `/build`, `/test`, `/review`, and `/ship`.
- **Specialized Personas:** Includes specialized roles like `code-reviewer`, `test-engineer`, and `security-auditor`.

### How to use in `eng_planner`:
Since this project utilizes Google Antigravity, you can use these skills to guide the agent through structured processes rather than ad-hoc prompting.

- **Installation:** You can install the skills locally so the agent automatically discovers them. Run the following command from the project root:
  ```bash
  gemini skills install ./agent-skills/skills/
  ```
- **Structured Development:** When building a new feature (e.g., modifying the Layer Panel or adding CAD export capabilities), ask the agent to use `/spec` to define the requirements, `/plan` to break down the tasks, and `/build` to implement the logic incrementally.
- **Quality Gates:** Before finalizing complex backend routes (like `convertRoutes.ts`), ask the agent to invoke `/review` or `@code-reviewer` to perform a rigorous 5-axis code review.
- **Testing:** Use `/test` to enforce Test-Driven Development (TDD) when adding new frontend utilities or backend endpoints.

## 2. Antigravity Skills (`/antigravity-skills`)

This folder contains a collection of tutorial and example skills specifically designed for Google Antigravity and the Gemini CLI. It demonstrates the "Agentic Command" pattern and breaks down skill creation into four progressive levels of complexity (Basic Routing, Asset Utilization, Few-Shot Learning, and Tool Use & Validation).

### Key Features:
- Serves as a masterclass on how to build your own AI agent skills.
- Includes practical examples like a `git-commit-formatter`, `license-header-adder`, `json-to-pydantic` converter, and a `database-schema-validator`.

### How to use in `eng_planner`:
You should use this directory as a reference guide to build custom, project-specific skills tailored to `eng_planner`.

- **Custom Automation:** If `eng_planner` has highly specific, repetitive tasks (e.g., standardizing specific CAD configurations, checking specific DXF conversion outputs, or scaffolding boilerplate UI components), you can build custom skills using these examples as templates.
- **Deployment:** To activate a custom skill, copy your newly created skill folder into your workspace's `.agent/skills/` directory (or `.gemini/config/skills/` for global use).
- **Scripts and Validation:** Follow the Level 4 (`database-schema-validator`) example to create custom Python/Node scripts that the agent can execute to deterministically validate CAD processing outputs.

## 3. Anthropic Skills (`/skills`)

This folder contains **Anthropic's implementation of skills for Claude**, demonstrating what's possible with the skills system. While designed for Claude, the patterns and instructions are broadly applicable across modern AI agents.

### Key Features:
- Provides examples ranging from creative tasks (design) to technical ones (testing web apps, MCP server generation).
- Includes document creation/editing skills (`docx`, `pdf`, `pptx`, `xlsx`).
- Uses a simple `SKILL.md` format with YAML frontmatter.

### How to use in `eng_planner`:
- **Reference for AI Output Generation:** Use these examples to guide the agent when generating specialized output formats or interacting with specific file types (like generating PDF reports for CAD files).
- **Tooling Inspiration:** Adapt the document parsing skills if you need to build custom integrations for your agent to read specific file formats related to the planner.

## 4. Evergreen Skills for Developers (`/evergreen-skills-developers`)

A curated repository detailing the non-technical and foundational technical skills that remain valuable regardless of the technology stack or framework.

### Key Features:
- **Core Skills:** Communication and teamwork.
- **Innovation & Process:** Agile development, problem-solving, and critical thinking.
- **General Technical Knowledge:** Data structures, clean code, Git management, DevOps practices, and architectural principles.

### How to use in `eng_planner`:
- **Development Standards:** Use this as a baseline standard for code quality and collaboration within the project. Reference these principles when doing code reviews or architectural planning.
- **Agent Alignment:** When asking the agent to refactor code or design a new component, you can instruct it to align with the "clean code" and "architecture" principles outlined in this directory.

## 5. Soft Skills (`/soft-skills`)

A guide dedicated specifically to the soft skills that make software engineers effective team members and professionals.

### Key Features:
- Covers topics like Responsibility, Organization, Evolving (learning), Teamwork, Problem Solving, and Business understanding.
- Emphasizes clear communication, empathy, and practical problem-solving.

### How to use in `eng_planner`:
- **Workflow Organization:** Apply the "Being Organized" and "Problem Solving" strategies (like splitting tasks into sub-tasks) to manage the complexity of this full-stack application.
- **Collaboration Guidelines:** Use these principles as a Code of Conduct for how developers (and AI agents acting as developers) should communicate, document code, and participate in code reviews.

---
By integrating these technical frameworks, AI agent skills, and foundational best practices, you can ensure that the `eng_planner` codebase remains robust, secure, and maintainable as it scales.
