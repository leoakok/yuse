import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Section, SectionItem } from "@/lib/types/cv";
import {
  buildCvBlocks,
  paginateCvBlocks,
  resolvePageBlocks,
  shouldShowSectionTitleForItem,
  type CvBlock,
} from "./cv-pagination";

function section(id: string, title: string): Section {
  return {
    id,
    workspaceId: "ws",
    type: "SKILLS",
    title,
    createdBy: "user",
    createdAt: "",
    updatedAt: "",
  };
}

function item(id: string, sectionType: Section["type"] = "SKILLS"): SectionItem {
  return {
    id,
    workspaceId: "ws",
    type: sectionType,
    headline: id,
    body: "",
    metadata: {},
    showInPreview: true,
    createdBy: "user",
    createdAt: "",
    updatedAt: "",
  };
}

describe("shouldShowSectionTitleForItem", () => {
  const skillSection = section("sec-skill", "Skills");
  const skillItem = { kind: "item" as const, section: skillSection, item: item("s1") };

  it("does not repeat title when section continues on a new page", () => {
    const prevItem: CvBlock = { kind: "item", section: skillSection, item: item("s2") };
    assert.equal(shouldShowSectionTitleForItem(skillItem, null, prevItem), false);
  });

  it("shows title when orphaned on the previous page", () => {
    const prevTitle: CvBlock = { kind: "section-title", section: skillSection };
    assert.equal(shouldShowSectionTitleForItem(skillItem, null, prevTitle), true);
  });

  it("does not repeat title when title block is already on the page", () => {
    const prevTitle: CvBlock = { kind: "section-title", section: skillSection };
    assert.equal(shouldShowSectionTitleForItem(skillItem, prevTitle, null), false);
  });
});

describe("resolvePageBlocks", () => {
  it("keeps continuation items without a repeated section header", () => {
    const skillSection = section("sec-skill", "Skills");
    const langSection = section("sec-lang", "Languages");
    const blocks: CvBlock[] = [
      { kind: "section-title", section: skillSection },
      { kind: "item", section: skillSection, item: item("s1") },
      { kind: "item", section: skillSection, item: item("s2") },
      { kind: "item", section: skillSection, item: item("s3") },
      { kind: "section-title", section: langSection },
      { kind: "item", section: langSection, item: item("l1") },
    ];

    const page1 = resolvePageBlocks([0, 1, 2], blocks, null);
    const page2 = resolvePageBlocks([3, 4, 5], blocks, 2);

    assert.equal(page1.filter((b) => b.kind === "section-title").length, 1);
    assert.equal(page2.filter((b) => b.kind === "section-title").length, 1);
    assert.equal(page2[0]?.kind, "item");
    assert.equal(page2[1]?.kind, "section-title");
  });
});

describe("paginateCvBlocks", () => {
  it("splits between item blocks", () => {
    const metrics = [
      { blockIndex: 0, height: 40, gapAfter: 4 },
      { blockIndex: 1, height: 30, gapAfter: 4 },
      { blockIndex: 2, height: 30, gapAfter: 0 },
    ];

    const pages = paginateCvBlocks(metrics, 78);
    assert.deepEqual(pages, [[0, 1], [2]]);
  });
});

describe("buildCvBlocks", () => {
  it("emits section title before visible items", () => {
    const skillSection = section("sec-skill", "Skills");
    const blocks = buildCvBlocks(undefined, [
      {
        section: skillSection,
        items: [item("s1"), { ...item("hidden"), showInPreview: false }],
      },
    ]);

    assert.deepEqual(
      blocks.map((b) => b.kind),
      ["section-title", "item"]
    );
  });
});
