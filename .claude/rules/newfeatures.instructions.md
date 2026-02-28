---
description: When I tell you about new features, you should follow these guidelines to understand and apply them correctly.
paths: **/*
---
When you create new features, make sure to:
1. Before executing new features, create a new md file in the .claude/rules directory with the name of the feature and a description of how to use it. This will help ensure that everyone on the team understands how to use the new feature correctly.
1. Verify if the backend already supports the feature. If it does, use the existing implementation.
2. If the backend does not support the feature, implement it in a way that is consistent with the existing codebase and follows best practices.
3. Use backend APIs in the frontend to ensure that the feature is properly integrated and functional.
4. Create pages and designs that are user-friendly and align with the overall design of the application.
5. Verify that the new feature works correctly and does not introduce any bugs or issues in the existing functionality.
6. Never use alert() in the codebase. Instead, use the existing error handling mechanisms to display error messages to users in a consistent and user-friendly way.