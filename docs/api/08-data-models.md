# API Data Models

Status: operator API reference for shared response models.

## Data Models

### Report

```typescript
interface Report {
  id: number;
  title: string;
  content: string; // Markdown format
  summary: string;
  reportType: "morning" | "evening";
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```
