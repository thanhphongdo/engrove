import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccentFlag } from "./accent-flag";

describe("AccentFlag", () => {
  it("renders a single flag for a single accent", () => {
    render(<AccentFlag accents={["en-US"]} />);
    expect(screen.getByLabelText("US English")).toBeInTheDocument();
  });
  it("renders multiple flags in given order", () => {
    render(<AccentFlag accents={["en-GB", "en-US"]} />);
    const flags = screen.getAllByRole("img");
    expect(flags).toHaveLength(2);
    expect(flags[0]).toHaveAttribute("aria-label", "British English");
    expect(flags[1]).toHaveAttribute("aria-label", "US English");
  });
});
