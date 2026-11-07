import { createContext, useContext } from "react";

/** 当前句的局部时钟：f = 本句第几帧，dur = 本句总帧数。卡片据此安排出场和退场。 */
export const ClockCtx = createContext({ f: 0, dur: 1 });
export const useClock = () => useContext(ClockCtx);
