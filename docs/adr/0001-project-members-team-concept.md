# 1. Project Members / Team Concept

Date: 2026-06-29

## Status

Proposed

## Context

Currently, the Rivet application has no concept of "Teams", "Departments", or specific "Project Members". The backend API simply returns all registered users via `/users`. As a result, when assigning a task to a user, the frontend displays the entire global user directory.

This allows users to assign tasks to anyone in the system, which is not ideal for larger organizations where users should only be able to assign tasks to their immediate team members or collaborators within a specific project.

To temporarily mitigate this on the frontend, a heuristic filter has been implemented (Option 1) which only allows assigning a task to the current logged-in user or anyone who is already assigned to a task within the same project. However, this is a workaround and presents chicken-and-egg problems when bootstrapping a new project or onboarding a new member.

## Decision

The backend architecture must be updated to introduce a `Project Member` mapping.

1. **Database Schema**: Introduce a many-to-many relationship table `project_members` linking `User` and `Project` entities.
2. **API Endpoint**: Introduce `GET /projects/{id}/members` to return only the users associated with a specific project.
3. **API Endpoint**: Introduce `POST /projects/{id}/members` and `DELETE /projects/{id}/members/{userId}` for project administrators to manage their team.
4. **Frontend Integration**: Once the backend endpoints exist, the frontend `TaskSlider` and `TasksPage` assignee dropdowns must be updated to consume `/projects/{id}/members` rather than the global `/users` list.

## Consequences

- **Positive**: Tasks can be restricted to only valid team members. Enhances security and UI clarity for large organizations.
- **Negative**: Requires backend migrations, updating DTOs, and managing invitations/additions of users to projects. Existing projects will need to be seeded with members (e.g. automatically adding anyone currently assigned to a task in that project).
