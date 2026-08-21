import { describe, expect, it } from "vitest";

import {
  getSeriesLength,
  getVotesToWin,
  isSeriesDecided,
  seriesWinnerSide,
} from "./series";

describe("getSeriesLength", () => {
  it("returns tier series lengths", () => {
    expect(getSeriesLength("pit")).toBe(1);
    expect(getSeriesLength("undercard")).toBe(3);
    expect(getSeriesLength("main_event")).toBe(7);
  });
});

describe("getVotesToWin", () => {
  it("returns first-to-majority thresholds", () => {
    expect(getVotesToWin("pit")).toBe(1);
    expect(getVotesToWin("undercard")).toBe(2);
    expect(getVotesToWin("main_event")).toBe(4);
  });
});

describe("isSeriesDecided", () => {
  it("decides pit on the first vote", () => {
    expect(isSeriesDecided(0, 0, "pit")).toBe(false);
    expect(isSeriesDecided(1, 0, "pit")).toBe(true);
    expect(isSeriesDecided(0, 1, "pit")).toBe(true);
  });

  it("decides undercard at 2 of 3", () => {
    expect(isSeriesDecided(1, 0, "undercard")).toBe(false);
    expect(isSeriesDecided(1, 1, "undercard")).toBe(false);
    expect(isSeriesDecided(2, 0, "undercard")).toBe(true);
    expect(isSeriesDecided(2, 1, "undercard")).toBe(true);
    expect(isSeriesDecided(0, 2, "undercard")).toBe(true);
  });

  it("decides main event at 4 of 7", () => {
    expect(isSeriesDecided(3, 3, "main_event")).toBe(false);
    expect(isSeriesDecided(4, 0, "main_event")).toBe(true);
    expect(isSeriesDecided(4, 3, "main_event")).toBe(true);
    expect(isSeriesDecided(2, 4, "main_event")).toBe(true);
  });
});

describe("seriesWinnerSide", () => {
  it("returns null while open", () => {
    expect(seriesWinnerSide(1, 1, "undercard")).toBeNull();
  });

  it("returns the leading side once decided", () => {
    expect(seriesWinnerSide(2, 1, "undercard")).toBe("a");
    expect(seriesWinnerSide(1, 2, "undercard")).toBe("b");
    expect(seriesWinnerSide(1, 0, "pit")).toBe("a");
  });
});
