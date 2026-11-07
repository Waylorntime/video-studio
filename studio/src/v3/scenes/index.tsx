import type { SceneDef } from "../ctx";
import { S01, S02, S03 } from "./ch1";
import { S04, S05 } from "./ch2";
import { S06, S07, S08, S09 } from "./ch3";
import { S10, S11, S12 } from "./ch4";
import { S13, S14, S15 } from "./ch5";
import { S16, S17 } from "./ch6";

/** 幕号 → 实现。分镜 JSON 里每句的 scene 字段对应这里的键 */
export const SCENES: Record<string, SceneDef> = { S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17 };
