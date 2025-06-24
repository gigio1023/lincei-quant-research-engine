import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  it("should_render_without_crashing", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.body).toBeInTheDocument();
  });

  it("should_render_main_container", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
