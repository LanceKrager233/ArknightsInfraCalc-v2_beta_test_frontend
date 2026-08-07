import assert from "node:assert/strict";
import test from "node:test";

import sourceManifest from "./generated/arkntools/source.json" with { type: "json" };
import {
  OPERATOR_CATALOG,
  PROFESSION_LABELS,
  operatorPortraitFor,
  operatorPresentationFor,
  operatorProfessionFor,
  operatorProfessionPresentation,
} from "./operatorPortraits.ts";

const PORTRAIT_VERSION = `${sourceManifest.version}-${sourceManifest.portraitsSource.commit.slice(0, 12)}`;
const portraitPath = (shortId: string) => `/images/operator-portraits/${shortId}.webp?v=${PORTRAIT_VERSION}`;

test("resolves portraits by stable id before display name and keeps planner aliases", () => {
  const amiyaPortrait = portraitPath("002_amiya");
  assert.equal(operatorPortraitFor("名称可以不同", "char_002_amiya"), amiyaPortrait);
  assert.equal(operatorPortraitFor("阿米娅(近卫)"), amiyaPortrait);
  assert.equal(operatorPortraitFor("阿米娅(医疗)"), amiyaPortrait);
  assert.equal(operatorPortraitFor("嘉辛塔"), portraitPath("4237_jcinta"));
  assert.equal(operatorPortraitFor("不存在的干员"), undefined);
});

test("maps the one-based planner skill index to presentation-only building skill data", () => {
  const presentation = operatorPresentationFor({ name: "阿米娅", skill: 1 });
  assert.equal(presentation.operator?.id, "char_002_amiya");
  assert.equal(presentation.buildingSkill?.index, 1);
  assert.equal(presentation.buildingSkill?.name, "合作协议");
  assert.match(presentation.buildingSkill?.description ?? "", /所有贸易站订单效率\+7%/);
  assert.doesNotMatch(presentation.buildingSkill?.description ?? "", /<[^>]*>/);
  assert.equal(operatorPresentationFor({ name: "阿米娅", skill: 99 }).buildingSkill, undefined);
});

test("resolves numeric profession codes to labeled icons for every cataloged operator", () => {
  assert.deepEqual(operatorProfessionFor("阿米娅"), 6);
  assert.deepEqual(operatorProfessionPresentation("阿米娅"), { label: "术师", icon: "/images/profession/术师.webp" });
  for (const operator of OPERATOR_CATALOG) {
    const profession = operatorProfessionFor(operator.name);
    assert.equal(profession, operator.profession);
    assert.ok(PROFESSION_LABELS[profession as number]);
    assert.equal(operatorProfessionPresentation(operator.name)?.icon, `/images/profession/${PROFESSION_LABELS[profession as number]}.webp`);
  }
  assert.equal(operatorProfessionFor("不存在的干员"), undefined);
  assert.equal(operatorProfessionPresentation("不存在的干员"), undefined);
});

test("generated catalog has unique ids, names, and matching stable portrait paths", () => {
  assert.ok(OPERATOR_CATALOG.length >= 400);
  assert.equal(new Set(OPERATOR_CATALOG.map((operator) => operator.id)).size, OPERATOR_CATALOG.length);
  assert.equal(new Set(OPERATOR_CATALOG.map((operator) => operator.name)).size, OPERATOR_CATALOG.length);
  for (const operator of OPERATOR_CATALOG) {
    assert.match(operator.id, /^char_[A-Za-z0-9_&]+$/);
    assert.equal(operator.portrait, portraitPath(operator.id.slice(5)));
  }
});
