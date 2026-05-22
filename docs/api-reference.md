# API Reference

This document provides a detailed reference for the Auto Investment Helper REST API.

## Base URL

```
http://localhost:3001
```

## Authentication

Currently, no authentication is required for the API endpoints. This will be updated in future production releases.

## Endpoints

### Health Check

-   **`GET /health`**
    -   **Description**: Checks the service's health, including database and AI service connectivity.
    -   **Response**:
        ```json
        {
          "status": "ok",
          "info": {
            "database": { "status": "up" },
            "gemini": { "status": "up" }
          },
          "details": {
            "database": { "status": "up" },
            "gemini": { "status": "up" }
          }
        }
        ```

### Reports

#### `GET /reports`

-   **Description**: Retrieves a paginated list of investment reports.
-   **Query Parameters**:
    -   `page` (number, optional, default: 1): The page number to retrieve.
    -   `limit` (number, optional, default: 10): The number of items per page.
-   **Response**:
    ```json
    {
      "reports": [
        {
          "id": 1,
          "title": "Morning Report - 2024-12-06",
          "summary": "Market indices are up, driven by tech sector performance.",
          "reportType": "morning",
          "createdAt": "2024-12-06T08:00:00.000Z"
        }
      ],
      "total": 25,
      "page": 1,
      "limit": 10
    }
    ```

#### `GET /reports/:id`

-   **Description**: Fetches a specific report by its unique ID.
-   **Path Parameters**:
    -   `id` (number, required): The ID of the report.
-   **Response**:
    -   Returns the full `Report` object on success.
    -   Returns `null` if the report is not found.

#### `POST /reports/generate/:type`

-   **Description**: Manually triggers the generation of a new report. This is an asynchronous operation.
-   **Path Parameters**:
    -   `type` (string, required): The type of report to generate. Must be `morning` or `evening`.
-   **Response**:
    -   Returns the newly created `Report` object.
    -   **Note**: This process can take up to 30 seconds as it involves AI-based analysis.

### News

#### `POST /news/collect`

-   **Description**: Manually triggers the news collection and processing workflow.
-   **Response**:
    ```json
    {
      "status": "success",
      "message": "News collection started."
    }
    ```

#### `GET /news/stats`

-   **Description**: Retrieves statistics about the collected news articles.
-   **Response**:
    ```json
    {
      "totalArticles": 520,
      "articlesToday": 35,
      "sources": {
        "Reuters": 150,
        "Bloomberg": 120
      }
      }
    ```

### Risk Gate

#### `GET /risk-gate/status`

-   **Description**: Returns the deterministic control-plane status. Broker execution is disabled.
-   **Response**:
    ```json
    {
      "brokerExecutionEnabled": false,
      "liveTradingEnabled": false,
      "defaultPolicy": {
        "maxGrossExposurePct": 100,
        "maxSinglePositionPct": 20,
        "maxOrderNotional": 1000000,
        "maxDailyLossPct": 3,
        "maxDrawdownPct": 10,
        "maxDataAgeMinutes": 60
      }
    }
    ```

#### `POST /risk-gate/evaluate`

-   **Description**: Evaluates a proposal against deterministic safety rules. This endpoint does not place orders and does not call broker APIs.
-   **Response Decisions**:
    -   `ALLOW`: dry-run proposal is inside policy limits.
    -   `REVIEW`: proposal is not denied, but human approval or missing provenance review is required.
    -   `DENY`: proposal violates hard policy.
-   **Example Request**:
    ```json
    {
      "mode": "dry_run",
      "actor": "strategy",
      "strategyId": "momentum-v1",
      "ruleId": "long-only-breakout",
      "generatedAt": "2026-05-22T11:59:00.000Z",
      "marketDataTimestamp": "2026-05-22T11:55:00.000Z",
      "portfolio": {
        "currency": "KRW",
        "equity": 10000000,
        "cash": 10000000,
        "grossExposurePct": 0
      },
      "orders": [
        {
          "symbol": "005930",
          "assetClass": "domestic_stock",
          "side": "BUY",
          "orderType": "MARKET",
          "notional": 500000,
          "targetPositionPct": 5
        }
      ]
    }
    ```
-   **Example Response**:
    ```json
    {
      "decision": "ALLOW",
      "mode": "dry_run",
      "brokerExecutionEnabled": false,
      "requiresHumanApproval": false,
      "reasons": [],
      "approvedOrderCount": 1
    }
    ```

## Data Models

### Report

```typescript
interface Report {
  id: number;
  title: string;
  content: string; // Markdown format
  summary: string;
  reportType: 'morning' | 'evening';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```
