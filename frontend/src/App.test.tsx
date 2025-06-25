import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

vi.mock("@/components/ui/glare-card", () => ({
  GlareCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/wavy-background", () => ({
  WavyBackground: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/faq", () => ({
  FaqSection: () => <div data-testid="faq-section"></div>,
}));

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
    expect(document.querySelector(".h-full")).toBeInTheDocument();
  });
});
